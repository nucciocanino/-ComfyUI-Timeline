"""
RBW Timeline Bridge for ComfyUI.

Architecture goals:
- Keep extension self-contained under custom_nodes for painless ComfyUI upgrades.
- Avoid patching ComfyUI core files.
- Expose a stable namespaced API (`/rbw_timeline/*`) plus legacy `/timeline/*` routes.
"""

from .api import register_routes

NODE_CLASS_MAPPINGS = {}
NODE_DISPLAY_NAME_MAPPINGS = {}
WEB_DIRECTORY = "./js"

register_routes()

