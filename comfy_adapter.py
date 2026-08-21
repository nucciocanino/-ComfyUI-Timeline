from __future__ import annotations

import time
import uuid
from typing import Any, Dict

import execution
import server


class ComfyPromptAdapter:
    """
    Thin adapter around ComfyUI prompt queue APIs.
    Keeps timeline code independent from Comfy server internals in one module.
    """

    async def queue_prompt(
        self,
        prompt: Dict[str, Any],
        *,
        client_id: str | None = None,
        extra_data: Dict[str, Any] | None = None,
        partial_execution_targets: Any = None,
        front: bool = False,
        number: float | None = None,
        prompt_id: str | None = None,
    ) -> Dict[str, Any]:
        prompt_server = server.PromptServer.instance
        if prompt_server is None:
            raise RuntimeError("PromptServer instance not available")

        if number is None:
            number = prompt_server.number
            if front:
                number = -number
            prompt_server.number += 1

        prompt_id = str(prompt_id or uuid.uuid4())
        # node_replace_manager was added in newer ComfyUI versions — guard for portability
        replace_mgr = getattr(prompt_server, "node_replace_manager", None)
        if replace_mgr is not None:
            replace_mgr.apply_replacements(prompt)

        valid = await execution.validate_prompt(prompt_id, prompt, partial_execution_targets)
        if not valid[0]:
            raise ValueError({"error": valid[1], "node_errors": valid[3]})

        safe_extra_data = dict(extra_data or {})
        if client_id is not None:
            safe_extra_data["client_id"] = client_id
        safe_extra_data["create_time"] = int(time.time() * 1000)

        # SENSITIVE_EXTRA_DATA_KEYS was added in newer ComfyUI versions — guard for portability
        sensitive = {}
        for sensitive_key in getattr(execution, "SENSITIVE_EXTRA_DATA_KEYS", []):
            if sensitive_key in safe_extra_data:
                sensitive[sensitive_key] = safe_extra_data.pop(sensitive_key)

        outputs_to_execute = valid[2]
        prompt_server.prompt_queue.put(
            (number, prompt_id, prompt, safe_extra_data, outputs_to_execute, sensitive)
        )

        return {"prompt_id": prompt_id, "number": number, "node_errors": valid[3]}

