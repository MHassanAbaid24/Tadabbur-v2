with open("tests/test_progress.py", "r") as f:
    text = f.read()

# I will just write a regex to indent the contents of the generated funcs
import re
text = re.sub(r'def _table_side_effect_(\d+)\(table_name\):\n            if ', r'def _table_side_effect_\1(table_name):\n                if ', text)
text = re.sub(r'            elif table_name', r'                elif table_name', text)
text = re.sub(r'            return MagicMock\(\)\n        mock_supabase', r'                return MagicMock()\n            mock_supabase', text)

with open("tests/test_progress.py", "w") as f:
    f.write(text)
