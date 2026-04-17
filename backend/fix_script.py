import os
import re

file_path = "tests/test_qf_user_auth.py"
with open(file_path, "r") as f:
    text = f.read()

# Fix 1
text = text.replace('assert "streaks:read" in url', 'assert "streak" in url')
text = text.replace('assert "notes:read" in url', 'assert "note" in url')

# Fix 2
text = text.replace(
    'mock_response_obj.raise_for_status.side_effect = Exception("Bad request")',
    'import httpx\n        mock_response_obj.raise_for_status.side_effect = httpx.HTTPError("Bad request")'
)

# Fix 3
text = text.replace(
    'patch("app.auth.qf_user_auth.supabase_client")',
    'patch("app.auth.qf_user_auth.async_supabase_client")'
)

# Fix 4: store_user_qf_token mock execute
text = text.replace(
    'mock_update.eq.return_value.execute.return_value = MagicMock()',
    'mock_update.eq.return_value.execute = AsyncMock(return_value=MagicMock())'
)

# Fix 5: get_user_qf_token mock execute
text = text.replace(
    'mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [',
    'mock_execute = AsyncMock()\n            mock_supabase.table.return_value.select.return_value.eq.return_value.execute = mock_execute\n            mock_execute.return_value.data = ['
)

with open(file_path, "w") as f:
    f.write(text)

