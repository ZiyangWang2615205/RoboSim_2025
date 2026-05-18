import asyncio

from algorithm_client.client import Client
from algorithm_client.scenario import Scenario
from algorithm_client.start import start_client


async def algorithm(client: Client, scenario: Scenario):
    await client.fail_scenario()


def main():
    asyncio.run(
        start_client(
            algorithm,
            token="TEST_TOKEN",
            name="Random Client",
            url="ws://localhost:7071",
        )
    )


if __name__ == "__main__":
    main()
