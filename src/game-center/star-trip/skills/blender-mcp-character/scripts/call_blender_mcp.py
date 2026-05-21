#!/usr/bin/env python3
"""Call a Blender MCP tool over stdio.

Default usage executes Python code in the connected Blender scene through the
`execute_blender_code` tool exposed by ahujasid/blender-mcp.
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
from pathlib import Path
from typing import Any


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Call Blender MCP over stdio.")
    parser.add_argument("--tool", default="execute_blender_code", help="MCP tool name.")
    parser.add_argument("--code-file", help="Python code file for execute_blender_code.")
    parser.add_argument("--prompt", default="Blender MCP task.", help="user_prompt argument.")
    parser.add_argument("--uvx", default=os.environ.get("UVX", "uvx"), help="Path to uvx.")
    parser.add_argument("--server", default="blender-mcp", help="uvx package/server command.")
    parser.add_argument("--timeout", type=float, default=120.0, help="Response timeout seconds.")
    parser.add_argument("--arg-json", help="Raw JSON arguments for non-code tools.")
    return parser.parse_args()


def send(proc: subprocess.Popen[str], message: dict[str, Any]) -> None:
    assert proc.stdin is not None
    proc.stdin.write(json.dumps(message) + "\n")
    proc.stdin.flush()


def read_response(proc: subprocess.Popen[str], response_id: int, timeout: float) -> dict[str, Any]:
    import time

    assert proc.stdout is not None
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        line = proc.stdout.readline()
        if not line:
            break
        try:
            data = json.loads(line)
        except json.JSONDecodeError:
            continue
        if data.get("id") == response_id:
            return data
    raise TimeoutError(f"Timed out waiting for MCP response id {response_id}")


def main() -> int:
    args = parse_args()

    if args.arg_json:
        tool_args = json.loads(args.arg_json)
    else:
        if args.code_file:
            code = Path(args.code_file).read_text()
        else:
            code = sys.stdin.read()
        if not code.strip():
            print("No code provided. Use --code-file or pipe code on stdin.", file=sys.stderr)
            return 2
        tool_args = {"code": code, "user_prompt": args.prompt}

    env = {**os.environ, "DISABLE_TELEMETRY": "true"}
    proc = subprocess.Popen(
        [args.uvx, args.server],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        env=env,
    )

    try:
        send(
            proc,
            {
                "jsonrpc": "2.0",
                "id": 1,
                "method": "initialize",
                "params": {
                    "protocolVersion": "2025-06-18",
                    "capabilities": {},
                    "clientInfo": {"name": "codex-blender-mcp-character", "version": "0.1"},
                },
            },
        )
        init = read_response(proc, 1, args.timeout)
        if "error" in init:
            print(json.dumps(init, indent=2), file=sys.stderr)
            return 1

        send(proc, {"jsonrpc": "2.0", "method": "notifications/initialized", "params": {}})
        send(
            proc,
            {
                "jsonrpc": "2.0",
                "id": 2,
                "method": "tools/call",
                "params": {"name": args.tool, "arguments": tool_args},
            },
        )
        result = read_response(proc, 2, args.timeout)
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return 1 if "error" in result else 0
    finally:
        proc.terminate()


if __name__ == "__main__":
    raise SystemExit(main())
