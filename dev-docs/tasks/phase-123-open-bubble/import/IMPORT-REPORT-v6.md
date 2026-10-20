# Bubble → NodeGX import report

Source: v6.json (app test-bubble-export, Bubble version 21). Converted 2026-10-16T14:43:09.314Z.

| what | count | mapped |
|---|---|---|
| pages | 3 | 3 |
| elements | 22 | 22 (100%) |
| element conditions | 7 | see findings |
| styles → variants | 40 | 32 |
| workflows | 2 | 2 |
| actions | 3 | 3 (100%) |
| expressions compiled | 7 | unknown operators: 0 |
| data types → collections | 2 | 2 |

## Findings (17)

| needs | where | what |
|---|---|---|
| a person or an AI | data type User | privacy rules (everyone, users_own_data) are not converted; nodegx.security.json needs a human or an AI pass |
| the dictionary | style HTML_default_ | no NodeGX element for a Bubble HTML; style skipped |
| the dictionary | style Input_standard_input_ | a conditional state whose condition is not hover/focus/pressed: {"next":{"type":"Message","name":"isnt_valid"},"type":"ThisElement"} |
| the dictionary | style Video_standard_video_ | no NodeGX element for a Bubble Video; style skipped |
| the dictionary | style GoogleMap_standard_map_ | no NodeGX element for a Bubble GoogleMap; style skipped |
| the dictionary | style SliderInput_slider_range_ | no NodeGX element for a Bubble SliderInput; style skipped |
| the dictionary | style Checkbox_standard_checkbox_ | a conditional state whose condition is not hover/focus/pressed: {"next":{"type":"Message","name":"isnt_valid"},"type":"ThisElement"} |
| the dictionary | style Dropdown_standard_dropdown_ | a conditional state whose condition is not hover/focus/pressed: {"next":{"type":"Message","name":"isnt_valid"},"type":"ThisElement"} |
| the dictionary | style FileInput_standard_uploader_ | no NodeGX element for a Bubble FileInput; style skipped |
| the dictionary | style SliderInput_standard_slider_ | no NodeGX element for a Bubble SliderInput; style skipped |
| the dictionary | style DateInput_standard_date_picker_ | no NodeGX element for a Bubble DateInput; style skipped |
| the dictionary | style AutocompleteDropdown_standard_search_ | a conditional state whose condition is not hover/focus/pressed: {"next":{"type":"Message","name":"isnt_valid"},"type":"ThisElement"} |
| the dictionary | style PictureInput_standard_image_uploader_ | no NodeGX element for a Bubble PictureInput; style skipped |
| the dictionary | style MultiLineInput_standard_multiline_input_ | a conditional state whose condition is not hover/focus/pressed: {"next":{"type":"Message","name":"isnt_valid"},"type":"ThisElement"} |
| the dictionary | reset_pw / Input B | conditional "this input isn't valid" has no NodeGX state; skipped |
| the dictionary | reset_pw / Input B | conditional "this input isn't valid" has no NodeGX state; skipped |
| the dictionary | reset_pw | Reset password: the "confirm password" check is Bubble-side; add a Condition comparing the two inputs before the reset |
