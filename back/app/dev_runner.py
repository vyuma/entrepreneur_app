import asyncio
import contextlib
import os
import signal
import sys
from collections.abc import Sequence

API_PORT = os.getenv("API_PORT", "8000")


async def _stream_output(prefix: str, stream: asyncio.StreamReader | None) -> None:
    if stream is None:
        return
    while True:
        line = await stream.readline()
        if not line:
            return
        print(f"[{prefix}] {line.decode().rstrip()}")


async def _spawn_process(name: str, command: Sequence[str]) -> asyncio.subprocess.Process:
    return await asyncio.create_subprocess_exec(
        *command,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.STDOUT,
    )


async def _terminate_process(name: str, process: asyncio.subprocess.Process) -> int | None:
    if process.returncode is not None:
        return process.returncode

    process.terminate()
    try:
        return await asyncio.wait_for(process.wait(), timeout=10)
    except asyncio.TimeoutError:
        print(f"[{name}] did not exit after SIGTERM, killing")
        process.kill()
        return await process.wait()


async def _run() -> int:
    commands = {
        "api": [sys.executable, "-m", "uvicorn", "app.main:app", "--reload", "--port", API_PORT],
        "bot": [sys.executable, "-m", "app.bot_runner"],
    }

    processes = {
        name: await _spawn_process(name, command)
        for name, command in commands.items()
    }

    stream_tasks = [
        asyncio.create_task(_stream_output(name, process.stdout))
        for name, process in processes.items()
    ]

    stop_event = asyncio.Event()
    loop = asyncio.get_running_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        with contextlib.suppress(NotImplementedError):
            loop.add_signal_handler(sig, stop_event.set)

    wait_tasks = {
        asyncio.create_task(process.wait()): name
        for name, process in processes.items()
    }
    stop_task = asyncio.create_task(stop_event.wait())

    done, pending = await asyncio.wait(
        [*wait_tasks.keys(), stop_task],
        return_when=asyncio.FIRST_COMPLETED,
    )

    exit_code = 0
    if stop_task in done:
        print("[dev] shutdown signal received")
    else:
        finished = next(task for task in done if task in wait_tasks)
        name = wait_tasks[finished]
        exit_code = finished.result() or 0
        print(f"[dev] {name} exited with code {exit_code}, stopping other processes")

    stop_task.cancel()
    for task in pending:
        task.cancel()

    for task in wait_tasks:
        if not task.done():
            task.cancel()

    shutdown_codes = await asyncio.gather(
        *(_terminate_process(name, process) for name, process in processes.items()),
        return_exceptions=True,
    )

    for code in shutdown_codes:
        if isinstance(code, int) and code not in (0, None) and exit_code == 0:
            exit_code = code

    for task in stream_tasks:
        task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await task

    return exit_code


def main() -> None:
    raise SystemExit(asyncio.run(_run()))


if __name__ == "__main__":
    main()
