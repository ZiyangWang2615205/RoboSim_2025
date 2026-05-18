from __future__ import annotations

from asyncio import Event
from typing import TYPE_CHECKING, Callable

if TYPE_CHECKING:
    from algorithm_client.actions import Action


class PendingAction:
    """An action that has been sent to the server.

    Used to wait for the action to be accepted or executed.
    Users should not instantiate this class directly. Note that if this object
    is not used, no error will be thrown if the server rejects the action.

    This object can be used multiple times.

    Example:

    .. code-block:: python

        # pending_move = client.send_move(move)

        # Wait for the move to be accepted
        await pending_move.accepted()

        # Wait for the move to be executed
        await pending_move.executed()
    """

    _action: Action
    _rejected_message: Callable[[], str | None]
    _accepted_event: Event
    _executed_event: Event

    def __init__(
        self,
        action: Action,
        rejected: Callable[[], str | None],
        accepted_event: Event,
        executed_event: Event,
    ):
        self._action = action
        self._rejected_message = rejected
        self._accepted_event = accepted_event
        self._executed_event = executed_event

    async def accepted(self) -> None:
        """
        Wait for the move to be accepted by the server.

        Raises:
            MoveError: If the move is rejected by the server.
        """
        await self._accepted_event.wait()

        if self._rejected_message():
            msg = f"Action {self._action} was rejected by the server"
            raise MoveError(msg)

    async def executed(self) -> None:
        """
        Wait for the move to be executed by the server.

        Raises:
            MoveError: If the move is rejected by the server.
        """
        await self._executed_event.wait()

        if self._rejected_message():
            msg = f"Action {self._action} was rejected by the server"
            raise MoveError(msg)


class MoveError(Exception):
    """Exception raised when a move is rejected by the server."""


class _ActionNotifier:
    """Internally represents a move that has been sent to the server.

    Used by the client to notify `PendingMove` classes when a move is
    accepted/rejected and executed.
    """

    _action: Action
    _rejected_message: str | None
    _accepted: bool
    _accepted_event: Event
    _executed_event: Event

    def __init__(
        self,
        action: Action,
    ):
        self._action = action
        self._rejected_message = None
        self._accepted = False
        self._accepted_event = Event()
        self._executed_event = Event()

    def pending_action(self) -> PendingAction:
        """Create a `PendingMove` linked to this notifier."""
        return PendingAction(
            self._action,
            lambda: self._rejected_message,
            self._accepted_event,
            self._executed_event,
        )

    def notify_accepted(self) -> None:
        """Notify that the move has been accepted by the server."""
        self._accepted = True
        self._accepted_event.set()

    def notify_executed(self) -> None:
        """Notify that the move has been executed by the server."""
        self._executed_event.set()

    def notify_rejected(self, message: str) -> None:
        """Notify that the move has been rejected by the server."""
        self._rejected_message = message
        self._accepted_event.set()
        self._executed_event.set()

    @property
    def id(self):
        return self._action.id

    def accepted(self) -> bool:
        return self._accepted

    def rejected(self) -> bool:
        return self._rejected_message is not None
