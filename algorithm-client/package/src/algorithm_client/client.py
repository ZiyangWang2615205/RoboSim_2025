from __future__ import annotations

import asyncio
import contextlib
import json
from asyncio import create_task
from dataclasses import dataclass
from enum import Enum
from typing import Any, Callable, Coroutine, final

from websockets.asyncio.client import ClientConnection, connect

from algorithm_client.actions import Action
from algorithm_client.logger import Logger
from algorithm_client.moves import Move, RejectedAction
from algorithm_client.pending_move import PendingAction, _ActionNotifier
from algorithm_client.scenario import Scenario


class Client:
    """
    An Algorithm Client. It is recommended to use the `start_client` function
    instead of instantiating this class directly.
    """

    _connection: ClientConnection
    _algorithm: Callable[[Client, Scenario], Coroutine[Any, Any, None]]
    _tick_rate: int
    _id: str

    _token: str
    _name: str
    _publish_runs: bool
    _custom_scenarios: list[Scenario] | None

    _pending_actions: list[_ActionNotifier]
    _logger: Logger | None

    def __init__(
        self,
        *,
        algorithm: Callable[[Client, Scenario], Coroutine[Any, Any, None]],
        token: str,
        name: str,
        publish_runs: bool,
        custom_scenarios: list[Scenario] | None = None,
        log_file: str | None = None,
    ):
        self._algorithm = algorithm
        self._token = token
        self._name = name
        self._publish_runs = publish_runs
        self._custom_scenarios = custom_scenarios
        if log_file:
            self._logger = Logger(log_file)
        else:
            self._logger = None

    @final
    async def start(self, url: str) -> None:
        """Connect to the server on the given address and port and start sending moves."""
        self._connection = await connect(url)

        initialize_request = _InitializeRequest(
            token=self._token,
            name=self._name,
            publish_runs=self._publish_runs,
            custom_scenarios=self._custom_scenarios,
        )

        message = _Message(_MessageType.INITIALIZE, initialize_request.to_json())

        await self._connection.send(message.to_json())

        initialize_message = await self._connection.recv()

        if not isinstance(initialize_message, str):
            msg = "Received message is not a string"
            raise TypeError(msg)

        initialize_message = _Message.from_json(initialize_message)

        if initialize_message.message_type == _MessageType.QUIT:
            msg = str(initialize_message.data)
            raise ValueError(msg)

        if initialize_message.message_type != _MessageType.INITIALIZE:
            msg = (
                "Received message is not an initialize message: "
                + str(initialize_message.message_type)
                + str(initialize_message.data)
            )
            raise TypeError(msg)

        if self._logger:
            self._logger.logmsg("\n-------------------------")
            self._logger.logmsg("New algorithm starting...")

        initialize_response = _InitializeResponse.from_json(initialize_message.data)
        self._tick_rate = initialize_response.tick_rate
        self._id = initialize_response.id

        # call start round until it returns false
        while await self._start_round():
            pass

    # returns False if we are quitting, True if we want to start another round after this one
    async def _start_round(self) -> bool:
        new_round_message = None

        while new_round_message is None:
            id_message = await self._connection.recv()
            if not isinstance(id_message, str):
                msg = "Received message is not a string"
                raise TypeError(msg)

            message: _Message = _Message.from_json(id_message)

            if message.message_type == _MessageType.QUIT:
                return False

            if message.message_type == _MessageType.NEW_ROUND:
                new_round_message = message

        scenario = Scenario.from_json(new_round_message.data)
        if self._logger:
            self._logger.logmsg(
                "Starting new round with scenario: " + str(Scenario.from_json(new_round_message.data).name)
            )

        await self._connection.send(_Message(_MessageType.OK).to_json())

        self._pending_actions = []

        handle_responses_task = create_task(self._handle_responses())

        algorithm_task = create_task(self._algorithm(self, scenario))

        # We want to wait for `handle_responses_task` to complete, while making
        # sure that if `algorithm_task` raises an error, we throw it immediately
        done, _ = await asyncio.wait({handle_responses_task, algorithm_task}, return_when=asyncio.FIRST_COMPLETED)

        if handle_responses_task in done:
            if algorithm_task.done():
                exception = algorithm_task.exception()
                if exception:
                    raise exception
            else:
                algorithm_task.cancel()
                # Make sure that algorithm_task does not throw any other
                # exceptions besides CancelledError
                with contextlib.suppress(asyncio.CancelledError):
                    await algorithm_task
        else:
            exception = algorithm_task.exception()
            if exception:
                raise exception

            # algorithm_task is done, so we still need to wait for
            # handle_responses_task to be done.
            await handle_responses_task
        return True

    async def send_move(self, move: Move) -> PendingAction:
        """Send a move to the server.

        Returns a PendingMove that can be used to wait for the move to be accepted
        or executed. Note that if you ignore the return value, no error will be
        thrown if the server rejects the move.
        """
        action = Action("move", move.id, move)

        return await self._send_action(action)

    async def displace_legs(self, box_id: int) -> PendingAction:
        """
        Displace the legs of the robot. This only works if the box is a Type 2
        box.

        Returns a PendingMove that can be used to wait for the action to be accepted
        or executed.
        """
        action = Action("displace_legs", box_id)

        return await self._send_action(action)

    async def withdraw_legs(self, box_id: int) -> PendingAction:
        """
        Withdraw the legs of the robot. This only works if the box is a Type 2
        box.

        Returns a PendingMove that can be used to wait for the action to be accepted
        or executed.
        """
        action = Action("withdraw_legs", box_id)

        return await self._send_action(action)

    async def extend_legs(self, box_id: int) -> PendingAction:
        """
        Extend the legs of the robot. This only works if the box is a Type 2
        box.

        Returns a PendingMove that can be used to wait for the action to be accepted
        or executed.
        """
        action = Action("extend_legs", box_id)

        return await self._send_action(action)

    async def retract_legs(self, box_id: int) -> PendingAction:
        """
        Retract the legs of the robot. This only works if the box is a Type 2
        box.

        Returns a PendingMove that can be used to wait for the action to be accepted
        or executed.
        """
        action = Action("retract_legs", box_id)

        return await self._send_action(action)

    async def _send_action(self, action: Action):
        action_notifier = _ActionNotifier(action)

        self._pending_actions.append(action_notifier)

        await self._connection.send(_Message(_MessageType.ACTION, action.to_json()).to_json())

        return action_notifier.pending_action()

    async def skip_scenario(self):
        """Skip the current scenario.

        This can only be called at the beginning of a scenario. If you want to
        skip the scenario mid-way through, use `fail_scenario()` instead.
        """
        await self._connection.send(_Message(_MessageType.SKIP).to_json())

    async def fail_scenario(self):
        """Voluntarily fail the current scenario.

        This is preferable to skipping if the algorithm has attempted to solve
        the scenario but failed to find a solution.
        """
        await self._connection.send(_Message(_MessageType.FAILED).to_json())

    async def _handle_responses(self):
        """Handles responses from the server.

        This method returns when the round ends.
        """
        while True:
            received_message = await self._connection.recv()
            if not isinstance(received_message, str):
                msg = "Received message is not a string"
                raise TypeError(msg)

            message: _Message = _Message.from_json(received_message)

            if message.message_type == _MessageType.ERROR:
                raise RuntimeError(message.data)

            if message.message_type == _MessageType.END:
                if self._logger:
                    self._logger.logmsg(
                        "Scenario was completed sucsessfully with "
                        + str(message.data[0])
                        + " moves, and took "
                        + str(message.data[1] / 1000)
                        + " seconds"
                    )
                return

            if message.message_type == _MessageType.FAILED:
                if self._logger:
                    self._logger.logerr("Scenario failed: " + message.data)
                return

            if message.message_type == _MessageType.ACCEPTED:
                box_id = message.data

                pending_action = next(
                    action
                    for action in self._pending_actions
                    if action.id == box_id and not action.accepted() and not action.rejected()
                )

                pending_action.notify_accepted()

            elif message.message_type == _MessageType.REJECTED:
                reject_action = RejectedAction.from_json(message.data)

                pending_action = next(
                    action
                    for action in self._pending_actions
                    if action.id == reject_action.id and not action.accepted() and not action.rejected()
                )

                pending_action.notify_rejected(reject_action.message)
                self._pending_actions.remove(pending_action)

            elif message.message_type == _MessageType.EXECUTED:
                box_id = message.data

                pending_action = next(
                    action for action in self._pending_actions if action.id == box_id and action.accepted()
                )

                pending_action.notify_executed()
                self._pending_actions.remove(pending_action)

    async def close(self):
        """Close the connection to the server."""
        await self._connection.close()


@dataclass(frozen=True)
class AuthOptions:
    """Options for authenticating with the server.

    Attributes:
        token: The token to use for authentication. You should obtain this from
            the web client.
        name: The name of the algorithm.
        author: The name of the author of the algorithm.
    """

    token: str
    author: str
    name: str

    def to_json(self):
        return {
            "token": self.token,
            "author": self.author,
            "name": self.name,
        }


@dataclass
class _InitializeRequest:
    name: str
    token: str
    publish_runs: bool
    custom_scenarios: list[Scenario] | None = None

    def to_json(self):
        scenarios_json = [scenario.to_json() for scenario in self.custom_scenarios] if self.custom_scenarios else None

        return {
            "name": self.name,
            "token": self.token,
            "publish_runs": self.publish_runs,
            "custom_scenarios": scenarios_json if self.custom_scenarios else None,
        }


@dataclass
class _InitializeResponse:
    id: str
    tick_rate: int

    @classmethod
    def from_json(cls, data: dict[str, Any]):
        return cls(data["id"], data["tick_rate"])


class _MessageType(Enum):
    INITIALIZE = "initialize"
    NEW_ROUND = "new_round"
    END = "end"
    FAILED = "failed"
    QUIT = "quit"
    OK = "ok"
    ERROR = "error"
    ACTION = "action"
    ACCEPTED = "accepted"
    EXECUTED = "executed"
    REJECTED = "rejected"
    SKIP = "skip"


class _Message:
    message_type: _MessageType
    data: Any

    def __init__(self, message_type: _MessageType, data: Any = None):
        self.message_type = message_type
        self.data = data

    def to_json(self) -> str:
        return json.dumps({"type": self.message_type.value, "data": self.data})

    @classmethod
    def from_json(cls, json_str: str) -> _Message:
        json_obj = json.loads(json_str)

        if "data" not in json_obj:
            return cls(_MessageType(json_obj["type"]))

        return cls(_MessageType(json_obj["type"]), json_obj["data"])
