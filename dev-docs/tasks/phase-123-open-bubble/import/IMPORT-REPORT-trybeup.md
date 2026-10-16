# Bubble → NodeGX import report

Source: trybeup.export.json (app trybeup, Bubble version 28). Converted 2026-10-16T15:54:14.593Z.

| what | count | mapped |
|---|---|---|
| pages | 18 | 18 |
| elements | 3941 | 3803 (96%) |
| element conditions | 1342 | see findings |
| styles → variants | 118 | 110 |
| workflows | 637 | 637 |
| actions | 1285 | 1040 (81%) |
| expressions compiled | 4871 | unknown operators: 10; field reads guessed by name: 191 |
| data types → collections | 40 | 40 |
| reusable elements → components | 33 | 33 |
| option sets → components | 45 | 45 |
| custom states → variables | — | 93 |
| searches → queries | — | 235 |
| converter crashes (caught) | — | 0 |

## Findings (1198)

| needs | where | what |
|---|---|---|
| a person or an AI | settings | plugins installed: box, ionic, ipify, google, stripe, facebook, star_rating, apiconnector2, materialicons, GoogleAnalytics, 1479901297703x967536405834891300, 1479946498882x370599375215525900, 1484327506287x474510747987607550, 1486351562130x708887586390409200, 1488796042609x768734193128308700, 1491714407143x279212378954661900, 1492117803371x414476256717570050, 1495642567089x595986733356023800, 1511219683528x454660121898516500, 1511317157580x426888521791832060, 1515787032525x876315403042684900, 1526912550459x175937239475814400, 1529535510382x166541069778419700, 1531024299355x489711521333772300, 1542315161624x547723000140267500, 1544679421691x581364656889921500, 1552401463205x225714219237769200, 1553006094610x835866904531566600, 1556883394581x267089014305587200, 1566842799501x841247558400999400, 1569324802126x167335311931867140, 1570928942102x865265385814622200, 1579142663191x584695513456836600, 1583324666271x739637822593433600, 1599995578736x177952455708377100, 1600428694838x613384526680293400, 1612954555842x701699261678485500, 1617984709726x406916995891068900, 1620119461660x211698519292772350, 1628402025407x977504799463571500, 1628635091879x551486334205427700, 1634649566581x778319647278891000, 1646064999757x815455456760954900 — plugin elements and actions have no NodeGX counterpart; each one is a hand or AI port |
| the dictionary | style HTML_default_ | no NodeGX element for a Bubble HTML; style skipped |
| the dictionary | style Input_standard_input_ | a conditional state whose condition is not hover/focus/pressed: {"next":{"type":"Message","name":"isnt_valid"},"type":"ThisElement"} |
| the dictionary | style Dropdown_an_main_dropdown_ | a conditional state whose condition is not hover/focus/pressed: {"next":{"args":950,"type":"Message","name":"greater_than"},"properties":{"name":"Current Page Width"},"type":"PageData" |
| the dictionary | style FileInput_standard_uploader_ | no NodeGX element for a Bubble FileInput; style skipped |
| the dictionary | style RepeatingGroup_rg_dashboard_left_menu_ | a conditional state whose condition is not hover/focus/pressed: {"next":{"next":{"type":"Message","name":"is_false"},"type":"Message","name":"isseller__boolean"},"type":"CurrentUser"} |
| the dictionary | style Text_h1_5_ | a conditional state whose condition is not hover/focus/pressed: {"next":{"args":1000,"type":"Message","name":"less_or_equal_than"},"properties":{"name":"Current Page Width"},"type":"Pa |
| the dictionary | style Text_an_h1_ | a conditional state whose condition is not hover/focus/pressed: {"next":{"args":1100,"type":"Message","name":"less_than"},"properties":{"name":"Current Page Width"},"type":"PageData"} |
| the dictionary | style Text_an_h1_ | a conditional state whose condition is not hover/focus/pressed: {"next":{"args":800,"type":"Message","name":"less_than"},"properties":{"name":"Current Page Width"},"type":"PageData"} |
| the dictionary | style Text_body_18_centred_ | a conditional state whose condition is not hover/focus/pressed: {"next":{"args":1000,"type":"Message","name":"less_or_equal_than"},"properties":{"name":"Current Page Width"},"type":"Pa |
| the dictionary | style Input_invisible_input_ | a conditional state whose condition is not hover/focus/pressed: {"next":{"type":"Message","name":"isnt_valid"},"type":"ThisElement"} |
| the dictionary | style DateInput_poppins_date_ | no NodeGX element for a Bubble DateInput; style skipped |
| the dictionary | style DateInput_an_date_picker_ | no NodeGX element for a Bubble DateInput; style skipped |
| the dictionary | style Dropdown_standard_dropdown_ | a conditional state whose condition is not hover/focus/pressed: {"next":{"type":"Message","name":"isnt_valid"},"type":"ThisElement"} |
| the dictionary | style Dropdown_an_filter_dropdown_ | a conditional state whose condition is not hover/focus/pressed: {"next":{"type":"Message","name":"isnt_valid"},"type":"ThisElement"} |
| the dictionary | style Dropdown_an_main_dropdown_v2_ | a conditional state whose condition is not hover/focus/pressed: {"next":{"args":950,"type":"Message","name":"greater_than"},"properties":{"name":"Current Page Width"},"type":"PageData" |
| the dictionary | style Dropdown_tu_dashboard_dropdowns_ | a conditional state whose condition is not hover/focus/pressed: {"next":{"type":"Message","name":"isnt_valid"},"type":"ThisElement"} |
| the dictionary | style Checkbox_arvo_regular___1f1f1f_14_ | a conditional state whose condition is not hover/focus/pressed: {"next":{"type":"Message","name":"isnt_valid"},"type":"ThisElement"} |
| the dictionary | style Dropdown_arvo_regular___c43f3a_18_ | a conditional state whose condition is not hover/focus/pressed: {"next":{"type":"Message","name":"isnt_valid"},"type":"ThisElement"} |
| the dictionary | style Text_h3_poppins_semi_bold_32px_red_ | a conditional state whose condition is not hover/focus/pressed: {"next":{"args":1000,"type":"Message","name":"less_or_equal_than"},"properties":{"name":"Current Page Width"},"type":"Pa |
| the dictionary | style AutocompleteDropdown_standard_search_ | a conditional state whose condition is not hover/focus/pressed: {"next":{"type":"Message","name":"isnt_valid"},"type":"ThisElement"} |
| the dictionary | style Dropdown_an_homepage_filter_dropdown_ | a conditional state whose condition is not hover/focus/pressed: {"next":{"type":"Message","name":"isnt_valid"},"type":"ThisElement"} |
| the dictionary | style Dropdown_an_homepage_filter_dropdown_ | a conditional state whose condition is not hover/focus/pressed: {"next":{"args":950,"type":"Message","name":"greater_than"},"properties":{"name":"Current Page Width"},"type":"PageData" |
| the dictionary | style PictureInput_standard_image_uploader_ | no NodeGX element for a Bubble PictureInput; style skipped |
| the dictionary | style Dropdown_an_filter_panel_blue_dropdown_ | a conditional state whose condition is not hover/focus/pressed: {"next":{"args":950,"type":"Message","name":"greater_than"},"properties":{"name":"Current Page Width"},"type":"PageData" |
| the dictionary | style MultiLineInput_standard_multiline_input_ | a conditional state whose condition is not hover/focus/pressed: {"next":{"type":"Message","name":"isnt_valid"},"type":"ThisElement"} |
| the dictionary | style 1495642567089x595986733356023800-ACX_air_picker_standard_ | no NodeGX element for a Bubble 1495642567089x595986733356023800-ACX; style skipped |
| the dictionary | style FileInput_an_uploader_ | no NodeGX element for a Bubble FileInput; style skipped |
| the dictionary | style Input_an_standard_input_ | a conditional state whose condition is not hover/focus/pressed: {"next":{"type":"Message","name":"isnt_valid"},"type":"ThisElement"} |
| the dictionary | style Input_arvo_regular___1f1f1f_14_ | a conditional state whose condition is not hover/focus/pressed: {"next":{"type":"Message","name":"isnt_valid"},"type":"ThisElement"} |
| the dictionary | style materialicons-Materialicon_icon_ | no NodeGX element for a Bubble materialicons-Materialicon; style skipped |
| the dictionary | style Dropdown_an_filter_panel_dropdown_ | a conditional state whose condition is not hover/focus/pressed: {"next":{"args":950,"type":"Message","name":"greater_than"},"properties":{"name":"Current Page Width"},"type":"PageData" |
| the dictionary | reusable desktop_header / HTML Custom CSS | Bubble element type HTML has no mapping yet; a Group placeholder stands in |
| a person or an AI | reusable desktop_header / HTML Custom CSS | an HTML element (<style> #header-bg {  background: linear-gradient(135deg, rg…): raw HTML/CSS, a person decides what it becomes |
| a person or an AI | reusable desktop_header | expression operator "specific_item" not in the dictionary (args 1) |
| a person or an AI | reusable desktop_header / AlphabetImage A | plugin element Alphabet Profile Images: Alphabet Image: its code is in static.js (window.plugins), a kit node is a port |
| the dictionary | reusable desktop_header / menu burger open | Bubble element type materialicons-Materialicon has no mapping yet; a Group placeholder stands in |
| the dictionary | reusable desktop_header / menu burger closed | Bubble element type materialicons-Materialicon has no mapping yet; a Group placeholder stands in |
| the dictionary | reusable desktop_header | Go to page: page cmNAG not in the export |
| the dictionary | reusable desktop_header | Go to page: page cmNAG not in the export |
| the dictionary | reusable desktop_header | Go to page: page cmNAG not in the export |
| a person or an AI | reusable desktop_header | HideElement SideBar Menu: the element lives in /Reusable/desktop_header, another component; a Component Input/Output carries that |
| the dictionary | reusable desktop_footer / HTML A | Bubble element type HTML has no mapping yet; a Group placeholder stands in |
| a person or an AI | reusable desktop_footer / HTML A | an HTML element (<!-- Start of HubSpot Embed Code --> <script type="text/java…): raw HTML/CSS, a person decides what it becomes |
| the dictionary | reusable desktop_footer / HTML social icons | Bubble element type HTML has no mapping yet; a Group placeholder stands in |
| a person or an AI | reusable desktop_footer / HTML social icons | an HTML element (…): raw HTML/CSS, a person decides what it becomes |
| a person or an AI | reusable desktop_footer / About us ButtonClicked | action type RefreshPage has no mapping; a placeholder keeps the chain intact |
| a person or an AI | reusable desktop_footer / Contact Us ButtonClicked | action type RefreshPage has no mapping; a placeholder keeps the chain intact |
| a person or an AI | reusable Popup get verified | data from the plugin API Stripe.js 2: BFP |
| a person or an AI | reusable Popup get verified | data from the plugin API Stripe Identity API v2: AAP |
| a person or an AI | reusable Popup get verified | data from the plugin API Stripe Identity API v2: AAP |
| a person or an AI | reusable Popup get verified | data from the plugin API Stripe Identity API v2: AAP |
| a person or an AI | reusable Popup get verified | data from the plugin API Stripe Identity API v2: AAP |
| a person or an AI | reusable Popup get verified | data from the plugin API Stripe Identity API v2: AAP |
| the dictionary | reusable Popup get verified / FileUploader B | Bubble element type FileInput has no mapping yet; a Group placeholder stands in |
| the dictionary | reusable Popup get verified / FileUploader A | Bubble element type FileInput has no mapping yet; a Group placeholder stands in |
| a person or an AI | reusable Popup get verified / Step stripe credit card ButtonClicked | action type stripe-GetUserCCInfo has no mapping; a placeholder keeps the chain intact |
| a person or an AI | reusable Popup get verified / Step stripe seller connect ButtonClicked | API Connector call cmPnN.cmPnO: an HTTP node with the call's url/method/headers from settings.apiconnector2 |
| a person or an AI | reusable Popup get verified / Step stripe seller connect ButtonClicked | API Connector call cmPnN.cmPnT: an HTTP node with the call's url/method/headers from settings.apiconnector2 |
| a person or an AI | reusable Popup get verified / Step stripe seller connect ButtonClicked | API Connector call cmPnN.cmPnT: an HTTP node with the call's url/method/headers from settings.apiconnector2 |
| a person or an AI | reusable Popup get verified / Step Stripe ID verification ButtonClicked | plugin action Stripe Identity API v2: AAc: its code is in static.js (window.plugins) |
| a person or an AI | reusable Popup get verified | data from the plugin API Stripe Identity API v2: AAP |
| a person or an AI | reusable Popup get verified | data from the plugin API Stripe Identity API v2: AAP |
| a person or an AI | reusable Popup get verified | data from the plugin API Stripe Identity API v2: AAP |
| a person or an AI | reusable Popup get verified | data from the plugin API Stripe Identity API v2: AAP |
| a person or an AI | reusable Popup get verified | data from the plugin API Stripe Identity API v2: AAP |
| a person or an AI | reusable Popup get verified | data from the plugin API Stripe Identity API v2: AAP |
| the dictionary | reusable Popup get verified | TerminateWorkflow: a one-signal action with no exact node yet (chain kept) |
| a person or an AI | reusable Popup get verified | data from the plugin API Stripe Identity API v2: AAP |
| a person or an AI | reusable Popup get verified | data from the plugin API Stripe Identity API v2: AAP |
| a person or an AI | reusable Popup get verified / Step Stripe ID verification ButtonClicked | plugin action Stripe Identity API v2: AAS: its code is in static.js (window.plugins) |
| a person or an AI | reusable Popup get verified | data from the plugin API Stripe Identity API v2: AAP |
| a person or an AI | reusable Popup get verified | data from the plugin API Stripe Identity API v2: AAP |
| a person or an AI | reusable Popup get verified | data from the plugin API Stripe Identity API v2: AAP |
| a person or an AI | reusable Popup get verified | data from the plugin API Stripe Identity API v2: AAP |
| a person or an AI | reusable Popup get verified workflow cmhmo | event InputChanged on FileUploader B (FileInput): that element has no such signal here; its actions are converted but nothing fires them |
| a person or an AI | reusable Popup get verified | SendEmail: Bubble sends mail from the server; NodeGX's cloud SendEmail node is the home (subject "Utility bill submitted") |
| a person or an AI | reusable Popup get verified / FileUploader B InputChanged | action type AlertShowMessage has no mapping; a placeholder keeps the chain intact |
| a person or an AI | reusable Popup get verified workflow cmhom | event InputChanged on FileUploader A (FileInput): that element has no such signal here; its actions are converted but nothing fires them |
| a person or an AI | reusable Popup get verified / FileUploader A InputChanged | action type AlertShowMessage has no mapping; a placeholder keeps the chain intact |
| a person or an AI | reusable Popup get verified / Step Stripe ID verification ButtonClicked | plugin action Stripe Identity API v2: AAc: its code is in static.js (window.plugins) |
| the dictionary | reusable back button / IonicIcon A | Bubble element type ionic-IonicIcon has no mapping yet; a Group placeholder stands in |
| the dictionary | reusable identity_pills / RepeatingGroup A | a conditional data source (two sources by condition): one Expression choosing between two queries is the NodeGX way |
| the dictionary | reusable identity_pills / Group verification pill | conditional button_disabled on a Group placed as Group: no such input here |
| a person or an AI | reusable image profil / AlphabetImage A | plugin element Alphabet Profile Images: Alphabet Image: its code is in static.js (window.plugins), a kit node is a port |
| the dictionary | reusable image profil | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable Social Media Bar - Listing | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable Social Media Bar - Listing | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable Social Media Bar - Listing | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable Social Media Bar - Listing | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable Social Media Bar - Listing | "Parent group's thing" with no ancestor group holding data |
| a person or an AI | reusable Social Media Bar - Listing / Image STRAVA ButtonClicked | plugin action TabOpener: Open in a new Tab: its code is in static.js (window.plugins) |
| a person or an AI | reusable Social Media Bar - Listing / Image IG ButtonClicked | plugin action TabOpener: Open in a new Tab: its code is in static.js (window.plugins) |
| a person or an AI | reusable Social Media Bar - Listing / Image FB ButtonClicked | plugin action TabOpener: Open in a new Tab: its code is in static.js (window.plugins) |
| a person or an AI | reusable Social Media Bar - Listing / Image TT ButtonClicked | plugin action TabOpener: Open in a new Tab: its code is in static.js (window.plugins) |
| a person or an AI | reusable Social Media Bar - Listing / Image YT ButtonClicked | plugin action TabOpener: Open in a new Tab: its code is in static.js (window.plugins) |
| the dictionary | reusable group booking | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable group booking | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable group booking | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable group booking | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable group booking | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable group booking | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable group booking | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable group booking | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable group booking | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable group booking | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable group booking | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable group booking | search constraint on User._id with a dynamic operator |
| the dictionary | reusable group booking | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable group booking | TerminateWorkflow: a one-signal action with no exact node yet (chain kept) |
| a person or an AI | reusable group booking / Button A ButtonClicked | plugin action AirAlert: AirAlert - Standard: its code is in static.js (window.plugins) |
| the dictionary | reusable group booking | ResetInputs: a one-signal action with no exact node yet (chain kept) |
| a person or an AI | reusable group booking | Schedule API workflow cmXhR: a backend workflow → a cloud function (lister, renter, listing, convoType, messageContent) |
| a person or an AI | reusable group booking | a ":filtered" list operator ({"constraints":{"0":{"key":"listing_custom_listing","value":{"type":"ElementPare): JavaScript in the composer's JS view |
| the dictionary | reusable group booking | Toggle element GroupFocus calendar details top: set to true in this spike; needs an inverter |
| the dictionary | reusable group booking | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable group booking | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable group booking | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable group booking | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable group booking | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable group booking | search constraint on User._id with a dynamic operator |
| the dictionary | reusable group booking | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable group booking | TerminateWorkflow: a one-signal action with no exact node yet (chain kept) |
| a person or an AI | reusable group booking / Button A ButtonClicked | plugin action AirAlert: AirAlert - Standard: its code is in static.js (window.plugins) |
| the dictionary | reusable group booking | ResetInputs: a one-signal action with no exact node yet (chain kept) |
| the dictionary | reusable group booking | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable booking panel / HTML A | Bubble element type HTML has no mapping yet; a Group placeholder stands in |
| a person or an AI | reusable booking panel / HTML A | an HTML element (<style> #height100 { height: 100% !important; } </style>…): raw HTML/CSS, a person decides what it becomes |
| the dictionary | reusable booking panel | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable booking panel | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable booking panel | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable booking panel | Toggle element GroupFocus calendar details top: set to true in this spike; needs an inverter |
| a person or an AI | reusable booking panel | Schedule API workflow cmXhR: a backend workflow → a cloud function (lister, renter, listing, convoType, messageContent) |
| a person or an AI | reusable booking panel | a ":filtered" list operator ({"constraints":{"0":{"key":"listing_custom_listing","value":{"type":"ElementPare): JavaScript in the composer's JS view |
| the dictionary | reusable booking panel | Toggle element GroupFocus calendar details top: set to true in this spike; needs an inverter |
| a person or an AI | reusable booking panel / Button A ButtonClicked | plugin action myAlerts!: 1. Info Toast: its code is in static.js (window.plugins) |
| the dictionary | reusable booking panel | search constraint on User._id with a dynamic operator |
| the dictionary | reusable booking panel | TerminateWorkflow: a one-signal action with no exact node yet (chain kept) |
| a person or an AI | reusable booking panel / Button A ButtonClicked | plugin action AirAlert: AirAlert - Standard: its code is in static.js (window.plugins) |
| the dictionary | reusable booking panel | ResetInputs: a one-signal action with no exact node yet (chain kept) |
| the dictionary | reusable booking panel | search constraint on User._id with a dynamic operator |
| the dictionary | reusable booking panel | TerminateWorkflow: a one-signal action with no exact node yet (chain kept) |
| a person or an AI | reusable booking panel / Button A ButtonClicked | plugin action AirAlert: AirAlert - Standard: its code is in static.js (window.plugins) |
| the dictionary | reusable booking panel | ResetInputs: a one-signal action with no exact node yet (chain kept) |
| the dictionary | reusable booking panel | Toggle element GroupFocus calendar details top: set to true in this spike; needs an inverter |
| a person or an AI | reusable G l Signup | OAuth login with google: NodeGX's SignInWith node needs the provider configured |
| a person or an AI | reusable G l Signup | Schedule API workflow cmXhO: a backend workflow → a cloud function (recipient, messageType) |
| a person or an AI | reusable G l Signup | SendEmail: Bubble sends mail from the server; NodeGX's cloud SendEmail node is the home (subject "New user account created") |
| a person or an AI | reusable G l Signup | OAuth login with facebook: NodeGX's SignInWith node needs the provider configured |
| a person or an AI | reusable G l Signup | Schedule API workflow cmXhO: a backend workflow → a cloud function (recipient, messageType) |
| a person or an AI | reusable G l Signup | SendEmail: Bubble sends mail from the server; NodeGX's cloud SendEmail node is the home (subject "New user account created") |
| a person or an AI | reusable G l Signup | SendConfirmationEmail: Bubble sends mail from the server; NodeGX's cloud SendEmail node is the home (subject "") |
| a person or an AI | reusable G l Signup | SendEmail: Bubble sends mail from the server; NodeGX's cloud SendEmail node is the home (subject "New user account created") |
| a person or an AI | reusable G l Signup | Schedule API workflow cmXhO: a backend workflow → a cloud function (recipient, messageType) |
| a person or an AI | reusable G l Signup | Schedule API workflow cmXhO: a backend workflow → a cloud function (link, recipient, messageText, messageType) |
| the dictionary | reusable G l Signup | ResetInputs: a one-signal action with no exact node yet (chain kept) |
| the dictionary | reusable Popup Pre-auth FAQ | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable user menu | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable dropdown_calendar | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable dropdown_calendar | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable dropdown_calendar | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable dropdown_calendar | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable dropdown_calendar | "Parent group's thing" with no ancestor group holding data |
| a person or an AI | reusable dropdown_calendar / ListofNumbers A | plugin element Toolbox: List of Numbers: its code is in static.js (window.plugins), a kit node is a port |
| the dictionary | reusable dropdown_calendar | "Parent group's thing" with no ancestor group holding data |
| a person or an AI | reusable dropdown_calendar | "Input current month total days" is read from /Reusable/dropdown_calendar (another component): a Component Output is the NodeGX way |
| the dictionary | reusable dropdown_calendar / Group B | a conditional data source (two sources by condition): one Expression choosing between two queries is the NodeGX way |
| the dictionary | reusable dropdown_calendar / Group B | conditional button_disabled on a Group placed as Group: no such input here |
| the dictionary | reusable dropdown_calendar / Group B | a conditional data source (two sources by condition): one Expression choosing between two queries is the NodeGX way |
| a person or an AI | reusable dropdown_calendar | "dropdown_calendar" is read from /Reusable/dropdown_calendar (another component): a Component Output is the NodeGX way |
| a person or an AI | reusable dropdown_calendar | "Input current month first day" is read from /Reusable/dropdown_calendar (another component): a Component Output is the NodeGX way |
| the dictionary | reusable dropdown_calendar / Group date decider | a conditional data source (two sources by condition): one Expression choosing between two queries is the NodeGX way |
| a person or an AI | reusable dropdown_calendar | "Input current month first day" is read from /Reusable/dropdown_calendar (another component): a Component Output is the NodeGX way |
| a person or an AI | reusable dropdown_calendar | "Input current month total days" is read from /Reusable/dropdown_calendar (another component): a Component Output is the NodeGX way |
| the dictionary | reusable dropdown_calendar / Group date decider | a conditional data source (two sources by condition): one Expression choosing between two queries is the NodeGX way |
| a person or an AI | reusable dropdown_calendar | "dropdown_calendar" is read from /Reusable/dropdown_calendar (another component): a Component Output is the NodeGX way |
| the dictionary | reusable dropdown_calendar / Group day cell date | conditional button_disabled on a Group placed as Group: no such input here |
| a person or an AI | reusable dropdown_calendar | "dropdown_calendar" is read from /Reusable/dropdown_calendar (another component): a Component Output is the NodeGX way |
| the dictionary | reusable dropdown_calendar / Group day cell date | conditional button_disabled on a Group placed as Group: no such input here |
| a person or an AI | reusable dropdown_calendar | "dropdown_calendar" is read from /Reusable/dropdown_calendar (another component): a Component Output is the NodeGX way |
| the dictionary | reusable dropdown_calendar / Group day cell date | conditional button_disabled on a Group placed as Group: no such input here |
| a person or an AI | reusable dropdown_calendar | "dropdown_calendar" is read from /Reusable/dropdown_calendar (another component): a Component Output is the NodeGX way |
| a person or an AI | reusable dropdown_calendar | "dropdown_calendar" is read from /Reusable/dropdown_calendar (another component): a Component Output is the NodeGX way |
| the dictionary | reusable dropdown_calendar / Group day cell date | conditional button_disabled on a Group placed as Group: no such input here |
| a person or an AI | reusable dropdown_calendar | "dropdown_calendar" is read from /Reusable/dropdown_calendar (another component): a Component Output is the NodeGX way |
| a person or an AI | reusable dropdown_calendar | date-range constraint "range_contains_point" on Booking.bookedDates: no range column type in the backend yet |
| the dictionary | reusable dropdown_calendar / Group day cell date | conditional button_disabled on a Group placed as Group: no such input here |
| a person or an AI | reusable dropdown_calendar | "dropdown_calendar" is read from /Reusable/dropdown_calendar (another component): a Component Output is the NodeGX way |
| a person or an AI | reusable dropdown_calendar | date-range constraint "range_contains_point" on Booking.bookedDates: no range column type in the backend yet |
| a person or an AI | reusable dropdown_calendar | "dropdown_calendar" is read from /Reusable/dropdown_calendar (another component): a Component Output is the NodeGX way |
| the dictionary | reusable dropdown_calendar / Group day cell date | conditional button_disabled on a Group placed as Group: no such input here |
| a person or an AI | reusable dropdown_calendar | "dropdown_calendar" is read from /Reusable/dropdown_calendar (another component): a Component Output is the NodeGX way |
| a person or an AI | reusable dropdown_calendar | date-range constraint "range_contains_point" on Booking.bookedDates: no range column type in the backend yet |
| a person or an AI | reusable dropdown_calendar | "dropdown_calendar" is read from /Reusable/dropdown_calendar (another component): a Component Output is the NodeGX way |
| the dictionary | reusable dropdown_calendar / Group day cell date | conditional button_disabled on a Group placed as Group: no such input here |
| the dictionary | reusable dropdown_calendar / Group day cell date | conditional button_disabled on a Group placed as Group: no such input here |
| a person or an AI | reusable dropdown_calendar | "dropdown_calendar" is read from /Reusable/dropdown_calendar (another component): a Component Output is the NodeGX way |
| a person or an AI | reusable dropdown_calendar | date-range constraint "range_contains_point" on Booking.bookedDates: no range column type in the backend yet |
| a person or an AI | reusable dropdown_calendar | "dropdown_calendar" is read from /Reusable/dropdown_calendar (another component): a Component Output is the NodeGX way |
| a person or an AI | reusable dropdown_calendar | "dropdown_calendar" is read from /Reusable/dropdown_calendar (another component): a Component Output is the NodeGX way |
| a person or an AI | reusable dropdown_calendar | "dropdown_calendar" is read from /Reusable/dropdown_calendar (another component): a Component Output is the NodeGX way |
| a person or an AI | reusable dropdown_calendar | date-range constraint "range_contains_point" on Booking.bookedDates: no range column type in the backend yet |
| a person or an AI | reusable dropdown_calendar | "dropdown_calendar" is read from /Reusable/dropdown_calendar (another component): a Component Output is the NodeGX way |
| the dictionary | reusable dropdown_calendar | TerminateWorkflow: a one-signal action with no exact node yet (chain kept) |
| a person or an AI | reusable dropdown_calendar | "dropdown_calendar" is read from /Reusable/dropdown_calendar (another component): a Component Output is the NodeGX way |
| a person or an AI | reusable dropdown_calendar | date-range constraint "range_contains_point" on Booking.bookedDates: no range column type in the backend yet |
| a person or an AI | reusable dropdown_calendar | "dropdown_calendar" is read from /Reusable/dropdown_calendar (another component): a Component Output is the NodeGX way |
| a person or an AI | reusable dropdown_calendar | "dropdown_calendar" is read from /Reusable/dropdown_calendar (another component): a Component Output is the NodeGX way |
| a person or an AI | reusable dropdown_calendar | "dropdown_calendar" is read from /Reusable/dropdown_calendar (another component): a Component Output is the NodeGX way |
| a person or an AI | reusable dropdown_calendar | "dropdown_calendar" is read from /Reusable/dropdown_calendar (another component): a Component Output is the NodeGX way |
| a person or an AI | reusable dropdown_calendar | date-range constraint "range_contains_point" on Booking.bookedDates: no range column type in the backend yet |
| a person or an AI | reusable dropdown_calendar | "dropdown_calendar" is read from /Reusable/dropdown_calendar (another component): a Component Output is the NodeGX way |
| the dictionary | reusable dropdown_calendar | TerminateWorkflow: a one-signal action with no exact node yet (chain kept) |
| a person or an AI | reusable dropdown_calendar | "dropdown_calendar" is read from /Reusable/dropdown_calendar (another component): a Component Output is the NodeGX way |
| a person or an AI | reusable dropdown_calendar | date-range constraint "range_contains_point" on Booking.bookedDates: no range column type in the backend yet |
| a person or an AI | reusable dropdown_calendar | "dropdown_calendar" is read from /Reusable/dropdown_calendar (another component): a Component Output is the NodeGX way |
| a person or an AI | reusable dropdown_calendar | "dropdown_calendar" is read from /Reusable/dropdown_calendar (another component): a Component Output is the NodeGX way |
| a person or an AI | reusable dropdown_calendar | "dropdown_calendar" is read from /Reusable/dropdown_calendar (another component): a Component Output is the NodeGX way |
| a person or an AI | reusable dropdown_calendar | "dropdown_calendar" is read from /Reusable/dropdown_calendar (another component): a Component Output is the NodeGX way |
| a person or an AI | reusable dropdown_calendar | date-range constraint "range_contains_point" on Booking.bookedDates: no range column type in the backend yet |
| a person or an AI | reusable dropdown_calendar | "dropdown_calendar" is read from /Reusable/dropdown_calendar (another component): a Component Output is the NodeGX way |
| the dictionary | reusable dropdown_calendar | TerminateWorkflow: a one-signal action with no exact node yet (chain kept) |
| a person or an AI | reusable dropdown_calendar | "dropdown_calendar" is read from /Reusable/dropdown_calendar (another component): a Component Output is the NodeGX way |
| a person or an AI | reusable dropdown_calendar | date-range constraint "range_contains_point" on Booking.bookedDates: no range column type in the backend yet |
| a person or an AI | reusable dropdown_calendar | "dropdown_calendar" is read from /Reusable/dropdown_calendar (another component): a Component Output is the NodeGX way |
| a person or an AI | reusable dropdown_calendar | "dropdown_calendar" is read from /Reusable/dropdown_calendar (another component): a Component Output is the NodeGX way |
| a person or an AI | reusable dropdown_calendar | "dropdown_calendar" is read from /Reusable/dropdown_calendar (another component): a Component Output is the NodeGX way |
| a person or an AI | reusable dropdown_calendar | "dropdown_calendar" is read from /Reusable/dropdown_calendar (another component): a Component Output is the NodeGX way |
| a person or an AI | reusable dropdown_calendar | date-range constraint "range_contains_point" on Booking.bookedDates: no range column type in the backend yet |
| a person or an AI | reusable dropdown_calendar | "dropdown_calendar" is read from /Reusable/dropdown_calendar (another component): a Component Output is the NodeGX way |
| the dictionary | reusable dropdown_calendar | TerminateWorkflow: a one-signal action with no exact node yet (chain kept) |
| a person or an AI | reusable dropdown_calendar | "dropdown_calendar" is read from /Reusable/dropdown_calendar (another component): a Component Output is the NodeGX way |
| a person or an AI | reusable dropdown_calendar | date-range constraint "range_contains_point" on Booking.bookedDates: no range column type in the backend yet |
| a person or an AI | reusable dropdown_calendar | "dropdown_calendar" is read from /Reusable/dropdown_calendar (another component): a Component Output is the NodeGX way |
| a person or an AI | reusable dropdown_calendar | "dropdown_calendar" is read from /Reusable/dropdown_calendar (another component): a Component Output is the NodeGX way |
| a person or an AI | reusable dropdown_calendar | "dropdown_calendar" is read from /Reusable/dropdown_calendar (another component): a Component Output is the NodeGX way |
| a person or an AI | reusable dropdown_calendar | "dropdown_calendar" is read from /Reusable/dropdown_calendar (another component): a Component Output is the NodeGX way |
| a person or an AI | reusable dropdown_calendar | date-range constraint "range_contains_point" on Booking.bookedDates: no range column type in the backend yet |
| a person or an AI | reusable dropdown_calendar | "dropdown_calendar" is read from /Reusable/dropdown_calendar (another component): a Component Output is the NodeGX way |
| the dictionary | reusable dropdown_calendar | TerminateWorkflow: a one-signal action with no exact node yet (chain kept) |
| a person or an AI | reusable dropdown_calendar | "dropdown_calendar" is read from /Reusable/dropdown_calendar (another component): a Component Output is the NodeGX way |
| a person or an AI | reusable dropdown_calendar | date-range constraint "range_contains_point" on Booking.bookedDates: no range column type in the backend yet |
| a person or an AI | reusable dropdown_calendar | "dropdown_calendar" is read from /Reusable/dropdown_calendar (another component): a Component Output is the NodeGX way |
| a person or an AI | reusable dropdown_calendar | "dropdown_calendar" is read from /Reusable/dropdown_calendar (another component): a Component Output is the NodeGX way |
| a person or an AI | reusable dropdown_calendar | "dropdown_calendar" is read from /Reusable/dropdown_calendar (another component): a Component Output is the NodeGX way |
| a person or an AI | reusable dropdown_calendar | "dropdown_calendar" is read from /Reusable/dropdown_calendar (another component): a Component Output is the NodeGX way |
| a person or an AI | reusable dropdown_calendar | "dropdown_calendar" is read from /Reusable/dropdown_calendar (another component): a Component Output is the NodeGX way |
| a person or an AI | reusable dropdown_calendar | "dropdown_calendar" is read from /Reusable/dropdown_calendar (another component): a Component Output is the NodeGX way |
| a person or an AI | reusable dropdown_calendar | date-range constraint "range_contains_point" on Booking.bookedDates: no range column type in the backend yet |
| a person or an AI | reusable dropdown_calendar | "dropdown_calendar" is read from /Reusable/dropdown_calendar (another component): a Component Output is the NodeGX way |
| the dictionary | reusable dropdown_calendar | TerminateWorkflow: a one-signal action with no exact node yet (chain kept) |
| a person or an AI | reusable dropdown_calendar | "dropdown_calendar" is read from /Reusable/dropdown_calendar (another component): a Component Output is the NodeGX way |
| a person or an AI | reusable dropdown_calendar | date-range constraint "range_contains_point" on Booking.bookedDates: no range column type in the backend yet |
| a person or an AI | reusable dropdown_calendar | "dropdown_calendar" is read from /Reusable/dropdown_calendar (another component): a Component Output is the NodeGX way |
| a person or an AI | reusable dropdown_calendar | date-range constraint "range_contained_by" on Booking.bookedDates: no range column type in the backend yet |
| a person or an AI | reusable dropdown_calendar | date-range constraint "range_contained_by" on Booking.bookedDates: no range column type in the backend yet |
| a person or an AI | reusable dropdown_calendar / when Search's count's not_equals 0's and_ Element dropdown_calendar's custom.selected_date_start_'s is_not_empty's and_ Element dropdown_calendar's custom.selected_date_end_'s is_not_empty | plugin action myAlerts!: 3. Warning Toast: its code is in static.js (window.plugins) |
| a person or an AI | reusable dropdown_calendar / when Element dropdown_calendar's custom.selected_date_end_'s minus Element dropdown_calendar's custom.selected_date_start_'s to_days's greater_than 5's and_ Element dropdown_calendar's custom.selected_date_start_'s is_not_empty's and_ Element dropdown_calendar's custom.selected_date_end_'s is_not_empty's and_ Element dropdown_calendar's get_group_data's lister_user's not_equals Current User | plugin action myAlerts!: 3. Warning Toast: its code is in static.js (window.plugins) |
| a person or an AI | reusable dropdown_calendar | date-range constraint "range_contained_by" on Booking.bookedDates: no range column type in the backend yet |
| a person or an AI | reusable dropdown_calendar | date-range constraint "range_contained_by" on Booking.bookedDates: no range column type in the backend yet |
| a person or an AI | reusable dropdown_calendar / when Search's count's not_equals 0's and_ Element dropdown_calendar's custom.selected_date_start_'s is_not_empty's and_ Element dropdown_calendar's custom.selected_date_end_'s is_not_empty | plugin action myAlerts!: 3. Warning Toast: its code is in static.js (window.plugins) |
| a person or an AI | reusable dropdown_calendar | date-range constraint "range_contains_point" on Booking.bookedDates: no range column type in the backend yet |
| the dictionary | reusable popup privacy | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable booking menu v2 | "Parent group's thing" with no ancestor group holding data |
| a person or an AI | reusable booking menu v2 / googlemap(bdk) A | plugin element Google Maps (bdk): google map (bdk): its code is in static.js (window.plugins), a kit node is a port |
| the dictionary | reusable booking menu v2 / Map bubble ref | Bubble element type GoogleMap has no mapping yet; a Group placeholder stands in |
| the dictionary | reusable booking menu v2 | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable booking menu v2 | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable booking menu v2 | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable booking menu v2 / MultilineInput A | conditional "this input isn't valid" has no NodeGX state; skipped |
| the dictionary | reusable booking menu v2 | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable booking menu v2 / Button condition report pickup | a conditional data source (two sources by condition): one Expression choosing between two queries is the NodeGX way |
| the dictionary | reusable booking menu v2 / Button condition report pickup | a conditional data source (two sources by condition): one Expression choosing between two queries is the NodeGX way |
| the dictionary | reusable booking menu v2 / Button condition report dropoff | a conditional data source (two sources by condition): one Expression choosing between two queries is the NodeGX way |
| the dictionary | reusable booking menu v2 / Button condition report dropoff | a conditional data source (two sources by condition): one Expression choosing between two queries is the NodeGX way |
| the dictionary | reusable booking menu v2 | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable booking menu v2 | "Parent group's thing" with no ancestor group holding data |
| a person or an AI | reusable booking menu v2 | Schedule API workflow cmXhO: a backend workflow → a cloud function (booking, listing, recipient, messageType) |
| a person or an AI | reusable booking menu v2 | SendEmail: Bubble sends mail from the server; NodeGX's cloud SendEmail node is the home (subject "Cancellation refund") |
| a person or an AI | reusable booking menu v2 | SendEmail: Bubble sends mail from the server; NodeGX's cloud SendEmail node is the home (subject "Cancellation refund") |
| a person or an AI | reusable booking menu v2 | Schedule API workflow cmXhO: a backend workflow → a cloud function (booking, listing, recipient, messageType) |
| the dictionary | reusable booking menu v2 | Toggle element GroupFocus A: set to true in this spike; needs an inverter |
| a person or an AI | reusable booking menu v2 / Button Complete the Dropoff popup ButtonClicked | plugin action AirAlert: AirAlert - Standard: its code is in static.js (window.plugins) |
| the dictionary | reusable booking menu v2 | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable booking menu v2 | "Parent group's thing" with no ancestor group holding data |
| a person or an AI | reusable booking menu v2 / Button Complete the Pickup popup ButtonClicked | plugin action AirAlert: AirAlert - Standard: its code is in static.js (window.plugins) |
| the dictionary | reusable booking menu v2 | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable booking menu v2 | "Parent group's thing" with no ancestor group holding data |
| a person or an AI | reusable booking menu v2 / Button C ButtonClicked | action type ChangeListOfThings has no mapping; a placeholder keeps the chain intact |
| a person or an AI | reusable booking menu v2 | SendEmail: Bubble sends mail from the server; NodeGX's cloud SendEmail node is the home (subject "Booking cancelled") |
| a person or an AI | reusable booking menu v2 / Button C ButtonClicked | plugin action AirAlert: AirAlert - Standard: its code is in static.js (window.plugins) |
| a person or an AI | reusable booking menu v2 / Button B ButtonClicked | plugin action AirAlert: AirAlert - Standard: its code is in static.js (window.plugins) |
| a person or an AI | reusable booking menu v2 / Button condition report dropoff ButtonClicked | plugin action AirAlert: AirAlert - Standard: its code is in static.js (window.plugins) |
| a person or an AI | reusable booking menu v2 / Button condition report pickup ButtonClicked | plugin action AirAlert: AirAlert - Standard: its code is in static.js (window.plugins) |
| the dictionary | reusable booking menu | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable booking menu / MultilineInput A | conditional "this input isn't valid" has no NodeGX state; skipped |
| the dictionary | reusable booking menu | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable booking menu | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable booking menu | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable booking menu | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable booking menu | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable booking menu | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable booking menu | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable booking menu | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable booking menu | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable booking menu | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable booking menu | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable booking menu | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable booking menu | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable booking menu | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable booking menu | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable booking menu | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable booking menu | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable booking menu | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable booking menu / Map bubble ref | Bubble element type GoogleMap has no mapping yet; a Group placeholder stands in |
| a person or an AI | reusable booking menu / googlemap(bdk) A | plugin element Google Maps (bdk): google map (bdk): its code is in static.js (window.plugins), a kit node is a port |
| the dictionary | reusable booking menu | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable booking menu | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable booking menu | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable booking menu / Group pickup condition report container | a conditional data source (two sources by condition): one Expression choosing between two queries is the NodeGX way |
| the dictionary | reusable booking menu / Group pickup condition report container | a conditional data source (two sources by condition): one Expression choosing between two queries is the NodeGX way |
| the dictionary | reusable booking menu / Group condition report dropoff container | a conditional data source (two sources by condition): one Expression choosing between two queries is the NodeGX way |
| the dictionary | reusable booking menu / Group condition report dropoff container | a conditional data source (two sources by condition): one Expression choosing between two queries is the NodeGX way |
| the dictionary | reusable booking menu | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable booking menu | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable booking menu / Button condition report pickup | a conditional data source (two sources by condition): one Expression choosing between two queries is the NodeGX way |
| the dictionary | reusable booking menu / Button condition report pickup | a conditional data source (two sources by condition): one Expression choosing between two queries is the NodeGX way |
| the dictionary | reusable booking menu / Button condition report dropoff | a conditional data source (two sources by condition): one Expression choosing between two queries is the NodeGX way |
| the dictionary | reusable booking menu / Button condition report dropoff | a conditional data source (two sources by condition): one Expression choosing between two queries is the NodeGX way |
| the dictionary | reusable booking menu | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable booking menu / MaterialIcon A | Bubble element type materialicons-Materialicon has no mapping yet; a Group placeholder stands in |
| the dictionary | reusable booking menu | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable booking menu | Toggle element GroupFocus A: set to true in this spike; needs an inverter |
| a person or an AI | reusable booking menu / Button condition report pickup ButtonClicked | plugin action AirAlert: AirAlert - Standard: its code is in static.js (window.plugins) |
| a person or an AI | reusable booking menu / Button B ButtonClicked | plugin action AirAlert: AirAlert - Standard: its code is in static.js (window.plugins) |
| a person or an AI | reusable booking menu / Button C ButtonClicked | action type ChangeListOfThings has no mapping; a placeholder keeps the chain intact |
| a person or an AI | reusable booking menu / Button C ButtonClicked | plugin action AirAlert: AirAlert - Standard: its code is in static.js (window.plugins) |
| a person or an AI | reusable booking menu / Button Complete the Pickup popup ButtonClicked | plugin action AirAlert: AirAlert - Standard: its code is in static.js (window.plugins) |
| a person or an AI | reusable booking menu / Button condition report dropoff ButtonClicked | plugin action AirAlert: AirAlert - Standard: its code is in static.js (window.plugins) |
| a person or an AI | reusable booking menu / Button Complete the Dropoff popup ButtonClicked | plugin action AirAlert: AirAlert - Standard: its code is in static.js (window.plugins) |
| the dictionary | reusable booking menu | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable booking menu | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable booking menu | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable booking menu | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable booking menu | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable booking menu | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable booking menu | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable booking menu | "Parent group's thing" with no ancestor group holding data |
| a person or an AI | reusable booking menu | Schedule API workflow cmXhO: a backend workflow → a cloud function (booking, listing, recipient, messageType) |
| a person or an AI | reusable booking menu | Schedule API workflow cmXhO: a backend workflow → a cloud function (booking, listing, recipient, messageType) |
| the dictionary | reusable listing menu | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable listing menu | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable listing menu | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable listing menu | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable listing menu | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable listing menu | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable listing menu | ResetGroup: a one-signal action with no exact node yet (chain kept) |
| the dictionary | reusable listing menu | Toggle element GroupFocus A: set to true in this spike; needs an inverter |
| a person or an AI | reusable listing menu / Button B ButtonClicked | plugin action myAlerts!: 2. Success Toast: its code is in static.js (window.plugins) |
| a person or an AI | reusable listing menu / Button B ButtonClicked | plugin action myAlerts!: 2. Success Toast: its code is in static.js (window.plugins) |
| a person or an AI | reusable listing menu / Icon D ButtonClicked | plugin action myAlerts!: 2. Success Toast: its code is in static.js (window.plugins) |
| the dictionary | reusable Social Media Bar | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable Social Media Bar | "Parent group's thing" with no ancestor group holding data |
| a person or an AI | reusable Social Media Bar / Image STRAVA ButtonClicked | plugin action TabOpener: Open in a new Tab: its code is in static.js (window.plugins) |
| a person or an AI | reusable Social Media Bar / Image IG ButtonClicked | plugin action TabOpener: Open in a new Tab: its code is in static.js (window.plugins) |
| a person or an AI | reusable Social Media Bar / Image FB ButtonClicked | plugin action TabOpener: Open in a new Tab: its code is in static.js (window.plugins) |
| a person or an AI | reusable Social Media Bar / Image TT ButtonClicked | plugin action TabOpener: Open in a new Tab: its code is in static.js (window.plugins) |
| a person or an AI | reusable Social Media Bar / Image YT ButtonClicked | plugin action TabOpener: Open in a new Tab: its code is in static.js (window.plugins) |
| a person or an AI | reusable r_messages | "RepeatingGroup A" is read from /Reusable/r_messages (another component): a Component Output is the NodeGX way |
| a person or an AI | reusable r_messages | a ":filtered" list operator ({"constraints":{"0":{"key":"_advanced_search_constraint","value":{"next":{"args"): JavaScript in the composer's JS view |
| a person or an AI | reusable r_messages | a ":sorted" list operator ({"descending":true,"sort_field":"Modified Date"}): JavaScript in the composer's JS view |
| a person or an AI | reusable r_messages | a ":filtered" list operator ({"constraints":{"0":{"key":"partiesinvolved_list_user","value":{"next":{"next":{): JavaScript in the composer's JS view |
| a person or an AI | reusable r_messages | a ":filtered" list operator ({"constraints":{"0":{"key":"_advanced_search_constraint","value":{"next":{"args"): JavaScript in the composer's JS view |
| a person or an AI | reusable r_messages | a ":filtered" list operator ({"constraints":{"0":{"key":"Created By","value":{"type":"CurrentUser"},"constrai): JavaScript in the composer's JS view |
| a person or an AI | reusable r_messages | a ":filtered" list operator ({"constraints":{"0":{"key":"Created By","value":{"type":"CurrentUser"},"constrai): JavaScript in the composer's JS view |
| a person or an AI | reusable r_messages / when Element RepeatingGroup A's get_list_data's filtered's count's not_equals 0 | action type ChangeListOfThings has no mapping; a placeholder keeps the chain intact |
| a person or an AI | reusable r_messages / Button A ButtonClicked | plugin action AirAlert: AirAlert - Standard: its code is in static.js (window.plugins) |
| the dictionary | reusable r_messages | TerminateWorkflow: a one-signal action with no exact node yet (chain kept) |
| a person or an AI | reusable r_messages / Button A ButtonClicked | action type ScheduleAPIEventOnList has no mapping; a placeholder keeps the chain intact |
| the dictionary | reusable r_messages | ResetInputs: a one-signal action with no exact node yet (chain kept) |
| a person or an AI | reusable r_claims_v2 | "repeating group imaje" is read from /Reusable/r_claims_v2 (another component): a Component Output is the NodeGX way |
| the dictionary | reusable r_claims_v2 / IonicIcon A | Bubble element type ionic-IonicIcon has no mapping yet; a Group placeholder stands in |
| a person or an AI | reusable r_claims_v2 | "repeating group imaje" is read from /Reusable/r_claims_v2 (another component): a Component Output is the NodeGX way |
| the dictionary | reusable r_claims_v2 / IonicIcon A | Bubble element type ionic-IonicIcon has no mapping yet; a Group placeholder stands in |
| the dictionary | reusable r_claims_v2 | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable r_claims_v2 | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable r_claims_v2 | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable r_claims_v2 | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable r_claims_v2 | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable r_claims_v2 | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable r_claims_v2 | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable r_claims_v2 | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable r_claims_v2 | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable r_claims_v2 | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable r_claims_v2 | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable r_claims_v2 | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable r_claims_v2 | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable r_claims_v2 | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable r_claims_v2 / Link A | a Link to a URL became a Text; its destination ({"entries":{"0":{"type":"ElementParent"}},"type":"TextExpression"}) is not wired |
| the dictionary | reusable r_claims_v2 / Link B | a Link to a URL became a Text; its destination ({"entries":{"0":{"next":{"type":"Message","name":"proofpurchase_file"},"type":"E) is not wired |
| the dictionary | reusable r_claims_v2 / Link C | a Link to a URL became a Text; its destination ({"entries":{"0":{"next":{"type":"Message","name":"repairs_file"},"type":"Element) is not wired |
| the dictionary | reusable r_claims_v2 / Link D | a Link to a URL became a Text; its destination ({"entries":{"0":{"next":{"type":"Message","name":"file_file"},"type":"ElementPar) is not wired |
| the dictionary | reusable r_claims_v2 / FileUploader A | Bubble element type FileInput has no mapping yet; a Group placeholder stands in |
| the dictionary | reusable r_claims_v2 / FileUploader A | conditional "this input isn't valid" has no NodeGX state; skipped |
| the dictionary | reusable r_claims_v2 | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable r_claims_v2 | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable r_claims_v2 | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable r_claims_v2 | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable r_claims_v2 / MultilineInput B | conditional "this input isn't valid" has no NodeGX state; skipped |
| the dictionary | reusable r_claims_v2 / MultilineInput C | conditional "this input isn't valid" has no NodeGX state; skipped |
| the dictionary | reusable r_claims_v2 / RepeatingGroup claims123 | a conditional data source (two sources by condition): one Expression choosing between two queries is the NodeGX way |
| a person or an AI | reusable r_claims_v2 | "RepeatingGroup claims123" is read from /Reusable/r_claims_v2 (another component): a Component Output is the NodeGX way |
| a person or an AI | reusable r_claims_v2 | a ":filtered" list operator ({"constraints":{"0":{"key":"_advanced_search_constraint","value":{"next":{"args"): JavaScript in the composer's JS view |
| a person or an AI | reusable r_claims_v2 / AlphabetImage B1.1 | plugin element Alphabet Profile Images: Alphabet Image: its code is in static.js (window.plugins), a kit node is a port |
| a person or an AI | reusable r_claims_v2 | a ":filtered" list operator ({"constraints":{"0":{"key":"_advanced_search_constraint","value":{"next":{"args"): JavaScript in the composer's JS view |
| a person or an AI | reusable r_claims_v2 | a ":sorted" list operator ({"descending":true,"sort_field":"Modified Date"}): JavaScript in the composer's JS view |
| a person or an AI | reusable r_claims_v2 | a ":filtered" list operator ({"constraints":{"0":{"key":"_advanced_search_constraint","value":{"next":{"args"): JavaScript in the composer's JS view |
| a person or an AI | reusable r_claims_v2 / AlphabetImage C | plugin element Alphabet Profile Images: Alphabet Image: its code is in static.js (window.plugins), a kit node is a port |
| a person or an AI | reusable r_claims_v2 / AlphabetImage D | plugin element Alphabet Profile Images: Alphabet Image: its code is in static.js (window.plugins), a kit node is a port |
| the dictionary | reusable r_claims_v2 / IonicIcon C | Bubble element type ionic-IonicIcon has no mapping yet; a Group placeholder stands in |
| the dictionary | reusable r_claims_v2 / Input E | conditional "this input isn't valid" has no NodeGX state; skipped |
| a person or an AI | reusable r_claims_v2 / AlphabetImage E | plugin element Alphabet Profile Images: Alphabet Image: its code is in static.js (window.plugins), a kit node is a port |
| the dictionary | reusable r_claims_v2 / RG user management ARCHIVE | a conditional data source (two sources by condition): one Expression choosing between two queries is the NodeGX way |
| a person or an AI | reusable r_claims_v2 / AlphabetImage A | plugin element Alphabet Profile Images: Alphabet Image: its code is in static.js (window.plugins), a kit node is a port |
| the dictionary | reusable r_claims_v2 / IonicIcon B | Bubble element type ionic-IonicIcon has no mapping yet; a Group placeholder stands in |
| the dictionary | reusable r_claims_v2 / IonicIcon B | conditional border_color on a ionic-IonicIcon placed as undefined: no such input here |
| the dictionary | reusable r_claims_v2 / IonicIcon B | conditional button_disabled on a ionic-IonicIcon placed as undefined: no such input here |
| a person or an AI | reusable r_claims_v2 | "RepeatingGroup Claims V2" is read from /Reusable/r_claims_v2 (another component): a Component Output is the NodeGX way |
| the dictionary | reusable r_claims_v2 / Text BZ | conditional border_color on a Text placed as Text: no such input here |
| the dictionary | reusable r_claims_v2 / IonicIcon B | Bubble element type ionic-IonicIcon has no mapping yet; a Group placeholder stands in |
| the dictionary | reusable r_claims_v2 / IonicIcon B | conditional border_color on a ionic-IonicIcon placed as undefined: no such input here |
| the dictionary | reusable r_claims_v2 / IonicIcon B | conditional button_disabled on a ionic-IonicIcon placed as undefined: no such input here |
| a person or an AI | reusable r_claims_v2 / ListofNumbers A | plugin element Toolbox: List of Numbers: its code is in static.js (window.plugins), a kit node is a port |
| the dictionary | reusable r_claims_v2 | ListShowPrevious: a one-signal action with no exact node yet (chain kept) |
| the dictionary | reusable r_claims_v2 | ListShowNext: a one-signal action with no exact node yet (chain kept) |
| a person or an AI | reusable r_claims_v2 | SendEmail: Bubble sends mail from the server; NodeGX's cloud SendEmail node is the home (subject "Your claim has been updated") |
| a person or an AI | reusable r_claims_v2 / Dropdown A InputChanged | plugin action AirAlert: AirAlert - Standard: its code is in static.js (window.plugins) |
| a person or an AI | reusable r_claims_v2 / Button Chat1.1 copy ButtonClicked | plugin action Stripe.js 2: Stripe.js - Refund - Create: its code is in static.js (window.plugins) |
| a person or an AI | reusable r_claims_v2 / Button Chat1.1 copy ButtonClicked | plugin action AirAlert: AirAlert - Standard: its code is in static.js (window.plugins) |
| the dictionary | reusable r_claims_v2 | TerminateWorkflow: a one-signal action with no exact node yet (chain kept) |
| a person or an AI | reusable r_claims_v2 / Button Chat1.1 copy ButtonClicked | plugin action AirAlert: AirAlert - Standard: its code is in static.js (window.plugins) |
| a person or an AI | reusable r_claims_v2 / Button Chat1.1 copy ButtonClicked | plugin action Stripe.js 2: Stripe.js - Refund - Create: its code is in static.js (window.plugins) |
| a person or an AI | reusable r_claims_v2 / Button Chat1.1 copy ButtonClicked | plugin action AirAlert: AirAlert - Standard: its code is in static.js (window.plugins) |
| the dictionary | reusable r_claims_v2 | TerminateWorkflow: a one-signal action with no exact node yet (chain kept) |
| a person or an AI | reusable r_claims_v2 / Button Chat1.1 copy ButtonClicked | plugin action AirAlert: AirAlert - Standard: its code is in static.js (window.plugins) |
| a person or an AI | reusable r_claims_v2 / Button Chat1.1 copy ButtonClicked | plugin action Stripe.js 2: Stripe.js - PaymentIntent - Capture: its code is in static.js (window.plugins) |
| a person or an AI | reusable r_claims_v2 / Button Chat1.1 copy ButtonClicked | plugin action AirAlert: AirAlert - Standard: its code is in static.js (window.plugins) |
| the dictionary | reusable r_claims_v2 | TerminateWorkflow: a one-signal action with no exact node yet (chain kept) |
| a person or an AI | reusable r_claims_v2 / Button Chat1.1 copy ButtonClicked | plugin action AirAlert: AirAlert - Standard: its code is in static.js (window.plugins) |
| a person or an AI | reusable r_claims_v2 | Schedule API workflow cmXhO: a backend workflow → a cloud function (claim, booking, listing, recipient, messageText, messageType) |
| a person or an AI | reusable r_claims_v2 | Schedule API workflow cmXhO: a backend workflow → a cloud function (claim, booking, listing, recipient, messageText, messageType) |
| a person or an AI | reusable r_claims_v2 / Button Chat1.1 copy 2 ButtonClicked | plugin action AirAlert: AirAlert - Standard: its code is in static.js (window.plugins) |
| the dictionary | reusable r_claims_v2 | ResetInputs: a one-signal action with no exact node yet (chain kept) |
| a person or an AI | reusable r_claims_v2 / Button H ButtonClicked | plugin action AirAlert: AirAlert - Standard: its code is in static.js (window.plugins) |
| a person or an AI | reusable r_claims_v2 / Button I ButtonClicked | plugin action Open URL In New Tab: Open URL in New Tab: its code is in static.js (window.plugins) |
| a person or an AI | reusable r_claims_v2 | Schedule API workflow cmXhO: a backend workflow → a cloud function (link, claim, booking, listing, recipient, messageText, messageType) |
| the dictionary | reusable r_claims_v2 | ResetInputs: a one-signal action with no exact node yet (chain kept) |
| a person or an AI | reusable r_claims_v2 | Schedule API workflow cmXhO: a backend workflow → a cloud function (claim, booking, listing, recipient, messageType) |
| a person or an AI | reusable r_claims_v2 | Schedule API workflow cmXhO: a backend workflow → a cloud function (claim, booking, listing, recipient, messageType) |
| a person or an AI | reusable r_claims_v2 / Button L ButtonClicked | plugin action AirAlert: AirAlert - Standard: its code is in static.js (window.plugins) |
| a person or an AI | reusable r_claims_v2 | Schedule API workflow cmXhO: a backend workflow → a cloud function (claim, booking, listing, recipient, messageText, messageType) |
| a person or an AI | reusable r_claims_v2 | Schedule API workflow cmXhO: a backend workflow → a cloud function (claim, booking, listing, recipient, messageText, messageType) |
| a person or an AI | reusable r_claims_v2 | ShowElement Popup claims details: the element lives in /Reusable/r_claims_v2, another component; a Component Input/Output carries that |
| a person or an AI | reusable r_claims_v2 | ShowElement Popup Claim form A: the element lives in /Reusable/r_claims_v2, another component; a Component Input/Output carries that |
| the dictionary | reusable r_claims_v2 | Go to page: page cmioh not in the export |
| the dictionary | reusable r_claims_v2 | ListShowPrevious: a one-signal action with no exact node yet (chain kept) |
| a person or an AI | reusable r_claims_v2 / Text BZ ButtonClicked | action type ListGoToPage has no mapping; a placeholder keeps the chain intact |
| the dictionary | reusable r_claims_v2 | ListShowNext: a one-signal action with no exact node yet (chain kept) |
| the dictionary | reusable r_claims_v2 | Go to page: page cmioh not in the export |
| the dictionary | reusable r_claims_v2 | ResetInputs: a one-signal action with no exact node yet (chain kept) |
| a person or an AI | reusable r_claims_v2 | ShowElement Popup Claim form A: the element lives in /Reusable/r_claims_v2, another component; a Component Input/Output carries that |
| a person or an AI | reusable header dashboards / AlphabetImage A | plugin element Alphabet Profile Images: Alphabet Image: its code is in static.js (window.plugins), a kit node is a port |
| a person or an AI | reusable r_condition_reports | a ":sorted" list operator ({"descending":true,"sort_field":"Created Date"}): JavaScript in the composer's JS view |
| a person or an AI | reusable r_condition_reports | a ":sorted" list operator ({"descending":true,"sort_field":"Created Date"}): JavaScript in the composer's JS view |
| the dictionary | reusable r_condition_reports | "Parent group's thing" with no ancestor group holding data |
| a person or an AI | reusable r_condition_reports | a ":sorted" list operator ({"descending":true,"sort_field":"Created Date"}): JavaScript in the composer's JS view |
| the dictionary | reusable r_condition_reports_V2 | "Parent group's thing" with no ancestor group holding data |
| a person or an AI | reusable r_condition_reports_V2 | "RepeatingGroup OP_user listing status V2 archive" is read from /Reusable/r_condition_reports_V2 (another component): a Component Output is the NodeGX way |
| a person or an AI | reusable r_condition_reports_V2 | a ":sorted" list operator ({"descending":true,"sort_field":"Created Date"}): JavaScript in the composer's JS view |
| a person or an AI | reusable r_condition_reports_V2 | a ":sorted" list operator ({"descending":true,"sort_field":"Created Date"}): JavaScript in the composer's JS view |
| a person or an AI | reusable r_condition_reports_V2 | ShowElement Popup condition report: the element lives in /Reusable/r_condition_reports_V2, another component; a Component Input/Output carries that |
| the dictionary | reusable r_condition_reports_V2 | ListShowNext: a one-signal action with no exact node yet (chain kept) |
| the dictionary | reusable r_condition_reports_V2 | ListShowPrevious: a one-signal action with no exact node yet (chain kept) |
| a person or an AI | reusable r_condition_reports_V2 | ShowElement Popup condition report: the element lives in /Reusable/r_condition_reports_V2, another component; a Component Input/Output carries that |
| the dictionary | reusable listing menu v2 | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable listing menu v2 | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable listing menu v2 | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable listing menu v2 | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable listing menu v2 | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable listing menu v2 | ResetGroup: a one-signal action with no exact node yet (chain kept) |
| the dictionary | reusable listing menu v2 | Toggle element GroupFocus A: set to true in this spike; needs an inverter |
| a person or an AI | reusable listing menu v2 / Button B ButtonClicked | plugin action myAlerts!: 2. Success Toast: its code is in static.js (window.plugins) |
| a person or an AI | reusable listing menu v2 / Button B ButtonClicked | plugin action myAlerts!: 2. Success Toast: its code is in static.js (window.plugins) |
| a person or an AI | reusable listing menu v2 / Icon D ButtonClicked | plugin action myAlerts!: 2. Success Toast: its code is in static.js (window.plugins) |
| the dictionary | reusable Popup help text | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable chatbox | "Parent group's thing" with no ancestor group holding data |
| a person or an AI | reusable chatbox | "RepeatingGroup A" is read from /Reusable/chatbox (another component): a Component Output is the NodeGX way |
| a person or an AI | reusable chatbox | a ":filtered" list operator ({"constraints":{"0":{"key":"readby_list_user","value":{"type":"CurrentUser","is_): JavaScript in the composer's JS view |
| a person or an AI | reusable chatbox | a ":filtered" list operator ({"constraints":{"0":{"key":"readby_list_user","value":{"type":"CurrentUser","is_): JavaScript in the composer's JS view |
| a person or an AI | reusable chatbox | a ":filtered" list operator ({"constraints":{"0":{"key":"_advanced_search_constraint","value":{"next":{"args"): JavaScript in the composer's JS view |
| a person or an AI | reusable chatbox | a ":filtered" list operator ({"constraints":{"0":{"key":"_advanced_search_constraint","value":{"next":{"args"): JavaScript in the composer's JS view |
| a person or an AI | reusable chatbox | a ":sorted" list operator ({"descending":true,"sort_field":"Modified Date"}): JavaScript in the composer's JS view |
| a person or an AI | reusable chatbox | a ":filtered" list operator ({"constraints":{"0":{"key":"partiesinvolved_list_user","value":{"next":{"next":{): JavaScript in the composer's JS view |
| a person or an AI | reusable chatbox | a ":filtered" list operator ({"constraints":{"0":{"key":"_advanced_search_constraint","value":{"next":{"args"): JavaScript in the composer's JS view |
| a person or an AI | reusable chatbox | a ":filtered" list operator ({"constraints":{"0":{"key":"_advanced_search_constraint","value":{"next":{"args"): JavaScript in the composer's JS view |
| a person or an AI | reusable chatbox / WatchInput A | plugin element 1T - Input Watcher: Watch Input: its code is in static.js (window.plugins), a kit node is a port |
| the dictionary | reusable chatbox / Input Chat Message | conditional "this input isn't valid" has no NodeGX state; skipped |
| a person or an AI | reusable chatbox / Page is loaded | action type ChangeListOfThings has no mapping; a placeholder keeps the chain intact |
| the dictionary | reusable chatbox | PauseWFClient: a one-signal action with no exact node yet (chain kept) |
| a person or an AI | reusable chatbox / Page is loaded | action type ScrollToListEntry has no mapping; a placeholder keeps the chain intact |
| a person or an AI | reusable chatbox | a ":filtered" list operator ({"constraints":{"0":{"key":"Created By","value":{"type":"CurrentUser"},"constrai): JavaScript in the composer's JS view |
| a person or an AI | reusable chatbox | a ":filtered" list operator ({"constraints":{"0":{"key":"Created By","value":{"type":"CurrentUser"},"constrai): JavaScript in the composer's JS view |
| a person or an AI | reusable chatbox / when Element RepeatingGroup A's get_list_data's filtered's count's not_equals 0 | action type ChangeListOfThings has no mapping; a placeholder keeps the chain intact |
| a person or an AI | reusable chatbox workflow cmgNF | plugin event 1T - Input Watcher: AAI: its actions are converted but nothing fires them |
| a person or an AI | reusable chatbox / 1T - Input Watcher: AAI | plugin action AirAlert: AirAlert - Standard: its code is in static.js (window.plugins) |
| the dictionary | reusable chatbox | TerminateWorkflow: a one-signal action with no exact node yet (chain kept) |
| a person or an AI | reusable chatbox / 1T - Input Watcher: AAI | action type ScheduleAPIEventOnList has no mapping; a placeholder keeps the chain intact |
| a person or an AI | reusable chatbox / 1T - Input Watcher: AAI | plugin action 1T - Input Watcher: AAQ: its code is in static.js (window.plugins) |
| a person or an AI | reusable chatbox / 1T - Input Watcher: AAI | action type ScrollToListEntry has no mapping; a placeholder keeps the chain intact |
| a person or an AI | reusable chatbox / Icon B ButtonClicked | plugin action AirAlert: AirAlert - Standard: its code is in static.js (window.plugins) |
| the dictionary | reusable chatbox | TerminateWorkflow: a one-signal action with no exact node yet (chain kept) |
| a person or an AI | reusable chatbox / Icon B ButtonClicked | action type ScheduleAPIEventOnList has no mapping; a placeholder keeps the chain intact |
| the dictionary | reusable chatbox | ResetInputs: a one-signal action with no exact node yet (chain kept) |
| a person or an AI | reusable chatbox / Icon B ButtonClicked | action type ScrollToListEntry has no mapping; a placeholder keeps the chain intact |
| a person or an AI | reusable chatbox / Group A ButtonClicked | action type ChangeListOfThings has no mapping; a placeholder keeps the chain intact |
| the dictionary | reusable chatbox | PauseWFClient: a one-signal action with no exact node yet (chain kept) |
| a person or an AI | reusable chatbox / Group A ButtonClicked | action type ScrollToListEntry has no mapping; a placeholder keeps the chain intact |
| the dictionary | reusable popup testimonial | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable popup testimonial / StarRating A | Bubble element type star_rating-StarRating has no mapping yet; a Group placeholder stands in |
| the dictionary | reusable popup testimonial / StarRating B | Bubble element type star_rating-StarRating has no mapping yet; a Group placeholder stands in |
| the dictionary | reusable popup testimonial / StarRating C | Bubble element type star_rating-StarRating has no mapping yet; a Group placeholder stands in |
| the dictionary | reusable popup testimonial / Map bubble ref | Bubble element type GoogleMap has no mapping yet; a Group placeholder stands in |
| a person or an AI | reusable popup testimonial | expression operator "divide" not in the dictionary (args 3) |
| a person or an AI | reusable popup testimonial | expression operator "round" not in the dictionary (args 1) |
| a person or an AI | reusable popup testimonial / Button A ButtonClicked | plugin action AirAlert: AirAlert - Standard: its code is in static.js (window.plugins) |
| the dictionary | reusable Popup Claim form | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable Popup Claim form | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable Popup Claim form | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable Popup Claim form | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable Popup Claim form | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable Popup Claim form | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable Popup Claim form | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable Popup Claim form / FileUploader condition report images | Bubble element type FileInput has no mapping yet; a Group placeholder stands in |
| the dictionary | reusable Popup Claim form / FileUploader condition report images | conditional disabled on a FileInput placed as undefined: no such input here |
| the dictionary | reusable Popup Claim form / RepeatingGroup image 234 | a conditional data source (two sources by condition): one Expression choosing between two queries is the NodeGX way |
| the dictionary | reusable Popup Claim form | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable Popup Claim form / FileUploader B purchaseproof1.1 | Bubble element type FileInput has no mapping yet; a Group placeholder stands in |
| the dictionary | reusable Popup Claim form / FileUploader B purchaseproof1.1 | conditional src on a FileInput placed as undefined: no such input here |
| the dictionary | reusable Popup Claim form / FileUploader B purchaseproof1.1 | conditional disabled on a FileInput placed as undefined: no such input here |
| the dictionary | reusable Popup Claim form | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable Popup Claim form | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable Popup Claim form / FileUploader C repairs 1.1 | Bubble element type FileInput has no mapping yet; a Group placeholder stands in |
| the dictionary | reusable Popup Claim form / FileUploader C repairs 1.1 | conditional src on a FileInput placed as undefined: no such input here |
| the dictionary | reusable Popup Claim form / FileUploader C repairs 1.1 | conditional disabled on a FileInput placed as undefined: no such input here |
| the dictionary | reusable Popup Claim form | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable Popup Claim form | "Parent group's thing" with no ancestor group holding data |
| a person or an AI | reusable Popup Claim form | Schedule API workflow cmVjN: a backend workflow → a cloud function (booking, payment) |
| a person or an AI | reusable Popup Claim form / Button A ButtonClicked | action type ChangeListOfThings has no mapping; a placeholder keeps the chain intact |
| the dictionary | reusable Popup Claim form | ResetInputs: a one-signal action with no exact node yet (chain kept) |
| a person or an AI | reusable Popup Claim form | SendEmail: Bubble sends mail from the server; NodeGX's cloud SendEmail node is the home (subject "A new claim has been submitted") |
| a person or an AI | reusable Popup Claim form | Schedule API workflow cmXhO: a backend workflow → a cloud function (link, claim, booking, listing, recipient, messageText, messageType) |
| a person or an AI | reusable Popup Claim form / Button A ButtonClicked | plugin action AirAlert: AirAlert - Standard: its code is in static.js (window.plugins) |
| the dictionary | reusable Popup Claim form | ResetInputs: a one-signal action with no exact node yet (chain kept) |
| a person or an AI | reusable Popup Claim form workflow cmVTj | event InputChanged on FileUploader condition report images (FileInput): that element has no such signal here; its actions are converted but nothing fires them |
| a person or an AI | reusable Popup Claim form | expression operator "plus_element" not in the dictionary (args {"next":{"type":"Message","name":"get_data"},"properties":{") |
| the dictionary | reusable Popup Claim form | ResetInputs: a one-signal action with no exact node yet (chain kept) |
| a person or an AI | reusable Popup Claim form workflow cmWyP | event InputChanged on FileUploader B purchaseproof1.1 (FileInput): that element has no such signal here; its actions are converted but nothing fires them |
| a person or an AI | reusable Popup Claim form workflow cmWyT | event InputChanged on FileUploader C repairs 1.1 (FileInput): that element has no such signal here; its actions are converted but nothing fires them |
| the dictionary | reusable Popup Claim form | ResetInputs: a one-signal action with no exact node yet (chain kept) |
| a person or an AI | reusable Popup Claim form / Button A ButtonClicked | plugin action AirAlert: AirAlert - Standard: its code is in static.js (window.plugins) |
| a person or an AI | reusable Popup Claim form | "Popup Claim form" is read from /Reusable/Popup Claim form (another component): a Component Output is the NodeGX way |
| a person or an AI | reusable Popup Claim form | expression operator "minus_element" not in the dictionary (args {"type":"ElementParent","is_slidable":false}) |
| a person or an AI | reusable Popup Claim form | "Group header and existing claim" is read from /Reusable/Popup Claim form (another component): a Component Output is the NodeGX way |
| a person or an AI | reusable Popup Claim form | "Group header and existing claim" is read from /Reusable/Popup Claim form (another component): a Component Output is the NodeGX way |
| the dictionary | reusable condition report / Map A | Bubble element type GoogleMap has no mapping yet; a Group placeholder stands in |
| a person or an AI | reusable condition report | Current Position (geolocation): a Geolocation node is the NodeGX way |
| a person or an AI | reusable condition report / JavascripttoBubble geolocation | plugin element Toolbox: Javascript to Bubble: its code is in static.js (window.plugins), a kit node is a port |
| the dictionary | reusable condition report | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable condition report | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable condition report | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable condition report | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable condition report | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable condition report | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable condition report | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable condition report | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable condition report | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable condition report | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable condition report | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable condition report | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable condition report | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable condition report | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable condition report | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable condition report | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable condition report | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable condition report | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable condition report | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable condition report | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable condition report | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable condition report | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable condition report | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable condition report | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable condition report | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable condition report | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable condition report | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable condition report | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable condition report | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable condition report | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable condition report | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable condition report | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable condition report | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable condition report | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable condition report | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable condition report | "Parent group's thing" with no ancestor group holding data |
| a person or an AI | reusable condition report / GPStracker | plugin element Geolocation element: GPS tracker: its code is in static.js (window.plugins), a kit node is a port |
| a person or an AI | reusable condition report / BN-GPSlocation popup | plugin element Native apps (bdk): BN - GPS location: its code is in static.js (window.plugins), a kit node is a port |
| the dictionary | reusable condition report | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable condition report / FileUploader condition report images | Bubble element type FileInput has no mapping yet; a Group placeholder stands in |
| a person or an AI | reusable condition report | "condition report" is read from /Reusable/condition report (another component): a Component Output is the NodeGX way |
| the dictionary | reusable condition report | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable condition report / FileUploader renter lister | Bubble element type PictureInput has no mapping yet; a Group placeholder stands in |
| the dictionary | reusable condition report / FileUploader renter lister | Bubble element type PictureInput has no mapping yet; a Group placeholder stands in |
| the dictionary | reusable condition report / MultilineInput damage report | conditional "this input isn't valid" has no NodeGX state; skipped |
| the dictionary | reusable condition report / MultilineInput damage report | conditional "this input isn't valid" has no NodeGX state; skipped |
| a person or an AI | reusable condition report / SignaturePad A | plugin element Signature Pad: Signature Pad: its code is in static.js (window.plugins), a kit node is a port |
| the dictionary | reusable condition report | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable condition report | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable condition report | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable condition report | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable condition report | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable condition report | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable condition report | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable condition report | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable condition report | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable condition report | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable condition report | TerminateWorkflow: a one-signal action with no exact node yet (chain kept) |
| a person or an AI | reusable condition report | Schedule API workflow cmXhO: a backend workflow → a cloud function (link, booking, listing, recipient, messageType, condition report) |
| a person or an AI | reusable condition report workflow cmVNV | event InputChanged on FileUploader condition report images (FileInput): that element has no such signal here; its actions are converted but nothing fires them |
| the dictionary | reusable condition report | ResetInputs: a one-signal action with no exact node yet (chain kept) |
| a person or an AI | reusable condition report / FileUploader condition report images InputChanged | plugin action AirAlert: AirAlert - Standard: its code is in static.js (window.plugins) |
| a person or an AI | reusable condition report workflow cmVNm | plugin event Signature Pad: AAH: its actions are converted but nothing fires them |
| a person or an AI | reusable condition report / Signature Pad: AAH | plugin action AirAlert: AirAlert - Standard: its code is in static.js (window.plugins) |
| the dictionary | reusable condition report | "Parent group's thing" with no ancestor group holding data |
| a person or an AI | reusable condition report / Button D ButtonClicked | plugin action Geolocation element: AAI: its code is in static.js (window.plugins) |
| the dictionary | reusable condition report | PauseWFClient: a one-signal action with no exact node yet (chain kept) |
| a person or an AI | reusable condition report / Button D ButtonClicked | plugin action AirAlert: AirAlert - Standard: its code is in static.js (window.plugins) |
| the dictionary | reusable condition report | TerminateWorkflow: a one-signal action with no exact node yet (chain kept) |
| a person or an AI | reusable condition report | a Formulas expression (CoordToAddress) needs a function |
| the dictionary | reusable condition report | "Parent group's thing" with no ancestor group holding data |
| a person or an AI | reusable condition report workflow cmVfX | plugin event Native apps (bdk): ACm: its actions are converted but nothing fires them |
| a person or an AI | reusable condition report / Native apps (bdk): ACm | plugin action AirAlert: AirAlert - Standard: its code is in static.js (window.plugins) |
| a person or an AI | reusable condition report workflow cmVhK | event InputChanged on FileUploader renter lister (PictureInput): that element has no such signal here; its actions are converted but nothing fires them |
| the dictionary | reusable condition report | ResetInputs: a one-signal action with no exact node yet (chain kept) |
| a person or an AI | reusable condition report / FileUploader renter lister InputChanged | plugin action AirAlert: AirAlert - Standard: its code is in static.js (window.plugins) |
| a person or an AI | reusable condition report | Current Position (geolocation): a Geolocation node is the NodeGX way |
| a person or an AI | reusable condition report | Current Position (geolocation): a Geolocation node is the NodeGX way |
| a person or an AI | reusable condition report workflow cmhzL | event type DoInterval not in the event dictionary; its 2 actions were still converted but nothing triggers them |
| a person or an AI | reusable condition report / DoInterval | plugin action Toolbox: Run javascript: its code is in static.js (window.plugins) |
| a person or an AI | reusable condition report / DoInterval | plugin action myAlerts!: 1. Info Toast: its code is in static.js (window.plugins) |
| a person or an AI | reusable condition report | "condition report" is read from /Reusable/condition report (another component): a Component Output is the NodeGX way |
| a person or an AI | reusable condition report workflow cmiPn | event InputChanged on FileUploader renter lister (PictureInput): that element has no such signal here; its actions are converted but nothing fires them |
| a person or an AI | reusable condition report / Button F ButtonClicked | action type stripe-ChargeUser has no mapping; a placeholder keeps the chain intact |
| a person or an AI | reusable condition report / Button F ButtonClicked | plugin action myAlerts!: 4. Error Toast: its code is in static.js (window.plugins) |
| the dictionary | reusable condition report | TerminateWorkflow: a one-signal action with no exact node yet (chain kept) |
| a person or an AI | reusable condition report / Button F ButtonClicked | plugin action myAlerts!: 2. Success Toast: its code is in static.js (window.plugins) |
| a person or an AI | reusable r_claims | "repeating group imaje" is read from /Reusable/r_claims (another component): a Component Output is the NodeGX way |
| the dictionary | reusable r_claims / IonicIcon A | Bubble element type ionic-IonicIcon has no mapping yet; a Group placeholder stands in |
| a person or an AI | reusable r_claims | "repeating group imaje" is read from /Reusable/r_claims (another component): a Component Output is the NodeGX way |
| the dictionary | reusable r_claims / IonicIcon A | Bubble element type ionic-IonicIcon has no mapping yet; a Group placeholder stands in |
| the dictionary | reusable r_claims | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable r_claims | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable r_claims | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable r_claims | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable r_claims | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable r_claims | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable r_claims | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable r_claims | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable r_claims | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable r_claims | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable r_claims | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable r_claims | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable r_claims | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable r_claims | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable r_claims / Link A | a Link to a URL became a Text; its destination ({"entries":{"0":{"type":"ElementParent"}},"type":"TextExpression"}) is not wired |
| the dictionary | reusable r_claims / Link B | a Link to a URL became a Text; its destination ({"entries":{"0":{"next":{"type":"Message","name":"proofpurchase_file"},"type":"E) is not wired |
| the dictionary | reusable r_claims / Link C | a Link to a URL became a Text; its destination ({"entries":{"0":{"next":{"type":"Message","name":"repairs_file"},"type":"Element) is not wired |
| the dictionary | reusable r_claims / Link D | a Link to a URL became a Text; its destination ({"entries":{"0":{"next":{"type":"Message","name":"file_file"},"type":"ElementPar) is not wired |
| the dictionary | reusable r_claims / FileUploader A | Bubble element type FileInput has no mapping yet; a Group placeholder stands in |
| the dictionary | reusable r_claims / FileUploader A | conditional "this input isn't valid" has no NodeGX state; skipped |
| the dictionary | reusable r_claims | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable r_claims | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable r_claims | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable r_claims | "Parent group's thing" with no ancestor group holding data |
| the dictionary | reusable r_claims / MultilineInput B | conditional "this input isn't valid" has no NodeGX state; skipped |
| the dictionary | reusable r_claims / MultilineInput C | conditional "this input isn't valid" has no NodeGX state; skipped |
| the dictionary | reusable r_claims / RepeatingGroup claims123 | a conditional data source (two sources by condition): one Expression choosing between two queries is the NodeGX way |
| a person or an AI | reusable r_claims | "RepeatingGroup claims123" is read from /Reusable/r_claims (another component): a Component Output is the NodeGX way |
| a person or an AI | reusable r_claims | a ":filtered" list operator ({"constraints":{"0":{"key":"_advanced_search_constraint","value":{"next":{"args"): JavaScript in the composer's JS view |
| a person or an AI | reusable r_claims / AlphabetImage B1.1 | plugin element Alphabet Profile Images: Alphabet Image: its code is in static.js (window.plugins), a kit node is a port |
| a person or an AI | reusable r_claims | a ":filtered" list operator ({"constraints":{"0":{"key":"_advanced_search_constraint","value":{"next":{"args"): JavaScript in the composer's JS view |
| a person or an AI | reusable r_claims | a ":sorted" list operator ({"descending":true,"sort_field":"Modified Date"}): JavaScript in the composer's JS view |
| a person or an AI | reusable r_claims | a ":filtered" list operator ({"constraints":{"0":{"key":"_advanced_search_constraint","value":{"next":{"args"): JavaScript in the composer's JS view |
| a person or an AI | reusable r_claims / AlphabetImage C | plugin element Alphabet Profile Images: Alphabet Image: its code is in static.js (window.plugins), a kit node is a port |
| a person or an AI | reusable r_claims / AlphabetImage D | plugin element Alphabet Profile Images: Alphabet Image: its code is in static.js (window.plugins), a kit node is a port |
| the dictionary | reusable r_claims / Group user management | a conditional data source (two sources by condition): one Expression choosing between two queries is the NodeGX way |
| a person or an AI | reusable r_claims / AlphabetImage A | plugin element Alphabet Profile Images: Alphabet Image: its code is in static.js (window.plugins), a kit node is a port |
| the dictionary | reusable r_claims | ListShowPrevious: a one-signal action with no exact node yet (chain kept) |
| the dictionary | reusable r_claims | ListShowNext: a one-signal action with no exact node yet (chain kept) |
| a person or an AI | reusable r_claims | SendEmail: Bubble sends mail from the server; NodeGX's cloud SendEmail node is the home (subject "Your claim has been updated") |
| a person or an AI | reusable r_claims / Dropdown A InputChanged | plugin action AirAlert: AirAlert - Standard: its code is in static.js (window.plugins) |
| a person or an AI | reusable r_claims / Button Chat1.1 copy ButtonClicked | plugin action Stripe.js 2: Stripe.js - Refund - Create: its code is in static.js (window.plugins) |
| a person or an AI | reusable r_claims / Button Chat1.1 copy ButtonClicked | plugin action AirAlert: AirAlert - Standard: its code is in static.js (window.plugins) |
| the dictionary | reusable r_claims | TerminateWorkflow: a one-signal action with no exact node yet (chain kept) |
| a person or an AI | reusable r_claims / Button Chat1.1 copy ButtonClicked | plugin action AirAlert: AirAlert - Standard: its code is in static.js (window.plugins) |
| a person or an AI | reusable r_claims / Button Chat1.1 copy ButtonClicked | plugin action Stripe.js 2: Stripe.js - Refund - Create: its code is in static.js (window.plugins) |
| a person or an AI | reusable r_claims / Button Chat1.1 copy ButtonClicked | plugin action AirAlert: AirAlert - Standard: its code is in static.js (window.plugins) |
| the dictionary | reusable r_claims | TerminateWorkflow: a one-signal action with no exact node yet (chain kept) |
| a person or an AI | reusable r_claims / Button Chat1.1 copy ButtonClicked | plugin action AirAlert: AirAlert - Standard: its code is in static.js (window.plugins) |
| a person or an AI | reusable r_claims / Button Chat1.1 copy ButtonClicked | plugin action Stripe.js 2: Stripe.js - PaymentIntent - Capture: its code is in static.js (window.plugins) |
| a person or an AI | reusable r_claims / Button Chat1.1 copy ButtonClicked | plugin action AirAlert: AirAlert - Standard: its code is in static.js (window.plugins) |
| the dictionary | reusable r_claims | TerminateWorkflow: a one-signal action with no exact node yet (chain kept) |
| a person or an AI | reusable r_claims / Button Chat1.1 copy ButtonClicked | plugin action AirAlert: AirAlert - Standard: its code is in static.js (window.plugins) |
| a person or an AI | reusable r_claims | Schedule API workflow cmXhO: a backend workflow → a cloud function (claim, booking, listing, recipient, messageText, messageType) |
| a person or an AI | reusable r_claims | Schedule API workflow cmXhO: a backend workflow → a cloud function (claim, booking, listing, recipient, messageText, messageType) |
| a person or an AI | reusable r_claims / Button Chat1.1 copy 2 ButtonClicked | plugin action AirAlert: AirAlert - Standard: its code is in static.js (window.plugins) |
| the dictionary | reusable r_claims | ResetInputs: a one-signal action with no exact node yet (chain kept) |
| a person or an AI | reusable r_claims / Button H ButtonClicked | plugin action AirAlert: AirAlert - Standard: its code is in static.js (window.plugins) |
| a person or an AI | reusable r_claims / Button I ButtonClicked | plugin action Open URL In New Tab: Open URL in New Tab: its code is in static.js (window.plugins) |
| a person or an AI | reusable r_claims | Schedule API workflow cmXhO: a backend workflow → a cloud function (link, claim, booking, listing, recipient, messageText, messageType) |
| the dictionary | reusable r_claims | ResetInputs: a one-signal action with no exact node yet (chain kept) |
| a person or an AI | reusable r_claims | Schedule API workflow cmXhO: a backend workflow → a cloud function (claim, booking, listing, recipient, messageType) |
| a person or an AI | reusable r_claims | Schedule API workflow cmXhO: a backend workflow → a cloud function (claim, booking, listing, recipient, messageType) |
| a person or an AI | reusable r_claims / Button L ButtonClicked | plugin action AirAlert: AirAlert - Standard: its code is in static.js (window.plugins) |
| a person or an AI | reusable r_claims | Schedule API workflow cmXhO: a backend workflow → a cloud function (claim, booking, listing, recipient, messageText, messageType) |
| a person or an AI | reusable r_claims | Schedule API workflow cmXhO: a backend workflow → a cloud function (claim, booking, listing, recipient, messageText, messageType) |
| a person or an AI | reusable r_claims | ShowElement Popup claims details: the element lives in /Reusable/r_claims, another component; a Component Input/Output carries that |
| the dictionary | reusable r_claims | ResetInputs: a one-signal action with no exact node yet (chain kept) |
| a person or an AI | index / GoogleMaps delivery location | plugin element Google Maps Directions & Tracking: Google Maps: its code is in static.js (window.plugins), a kit node is a port |
| a person or an AI | index | a Formulas expression (CoordToAddress) needs a function |
| the dictionary | index | "Parent group's thing" with no ancestor group holding data |
| the dictionary | index | "Parent group's thing" with no ancestor group holding data |
| a person or an AI | index | a ":filtered" list operator ({"constraints":{"0":{"key":"distance_number","value":{"next":{"properties":{"ori): JavaScript in the composer's JS view |
| the dictionary | index | "Parent group's thing" with no ancestor group holding data |
| a person or an AI | index | a ":filtered" list operator ({"constraints":{"0":{"key":"distance_number","value":{"next":{"properties":{"ori): JavaScript in the composer's JS view |
| the dictionary | index | "Parent group's thing" with no ancestor group holding data |
| a person or an AI | index | a ":filtered" list operator ({"constraints":{"0":{"key":"distance_number","value":{"next":{"properties":{"ori): JavaScript in the composer's JS view |
| the dictionary | index | "Parent group's thing" with no ancestor group holding data |
| a person or an AI | index | "RepeatingGroup Listing98 v2" is read from /Pages/index (another component): a Component Output is the NodeGX way |
| a person or an AI | index | "RepeatingGroup Listing98 v2" is read from /Pages/index (another component): a Component Output is the NodeGX way |
| the dictionary | index | search constraint on Listing._id with a dynamic operator |
| the dictionary | index / Date/TimePicker Start | Bubble element type DateInput has no mapping yet; a Group placeholder stands in |
| the dictionary | index / Date/TimePicker End | Bubble element type DateInput has no mapping yet; a Group placeholder stands in |
| a person or an AI | index / googlemap(bdk) A | plugin element Google Maps (bdk): google map (bdk): its code is in static.js (window.plugins), a kit node is a port |
| a person or an AI | index / AirDate/TimePickerv2 search popup v2 | plugin element  Air Date / Time Picker: Air Date/Time Picker v2: its code is in static.js (window.plugins), a kit node is a port |
| a person or an AI | index | "RepeatingGroup Listing98 v2" is read from /Pages/index (another component): a Component Output is the NodeGX way |
| a person or an AI | index | "RepeatingGroup Listing98 v2" is read from /Pages/index (another component): a Component Output is the NodeGX way |
| the dictionary | index / RepeatingGroup O | a conditional data source (two sources by condition): one Expression choosing between two queries is the NodeGX way |
| a person or an AI | index | "RepeatingGroup Listing98 v2" is read from /Pages/index (another component): a Component Output is the NodeGX way |
| a person or an AI | index | "RepeatingGroup Listing98 v2" is read from /Pages/index (another component): a Component Output is the NodeGX way |
| the dictionary | index / RepeatingGroup O | repeating group without a data source |
| a person or an AI | index / AirDate/TimePickerv2 search popup | plugin element  Air Date / Time Picker: Air Date/Time Picker v2: its code is in static.js (window.plugins), a kit node is a port |
| a person or an AI | index | a ":filtered" list operator ({"constraints":{"0":{"key":"name_text","value":{"entries":{"0":{"next":{"next":{): JavaScript in the composer's JS view |
| a person or an AI | index | a ":filtered" list operator ({"constraints":{"0":{"key":"name_text","value":{"entries":{"0":{"next":{"next":{): JavaScript in the composer's JS view |
| the dictionary | index / IonicIcon I | Bubble element type ionic-IonicIcon has no mapping yet; a Group placeholder stands in |
| a person or an AI | index | "RepeatingGroup Listing98 v2" is read from /Pages/index (another component): a Component Output is the NodeGX way |
| a person or an AI | index | "RepeatingGroup Listing98 v2" is read from /Pages/index (another component): a Component Output is the NodeGX way |
| the dictionary | index / IonicIcon D | Bubble element type ionic-IonicIcon has no mapping yet; a Group placeholder stands in |
| the dictionary | index / HTML Custom CSS | Bubble element type HTML has no mapping yet; a Group placeholder stands in |
| a person or an AI | index / HTML Custom CSS | an HTML element (<style> #home-bg { /* background: var(--page-gradient-dark-m…): raw HTML/CSS, a person decides what it becomes |
| a person or an AI | index / HTML video vimeo player | plugin element HTML5 Video Player: HTML5 Video Player: its code is in static.js (window.plugins), a kit node is a port |
| a person or an AI | index / HTML video vimeo player | plugin element HTML5 Video Player: HTML5 Video Player: its code is in static.js (window.plugins), a kit node is a port |
| the dictionary | index / Dropdown S | conditional "this input isn't valid" has no NodeGX state; skipped |
| the dictionary | index / IonicToggle A | Bubble element type ionic-IonicToggle has no mapping yet; a Group placeholder stands in |
| the dictionary | index / Dropdown T | conditional "this input isn't valid" has no NodeGX state; skipped |
| the dictionary | index / Dropdown T | conditional "this input isn't valid" has no NodeGX state; skipped |
| the dictionary | index / Dropdown T | conditional "this input isn't valid" has no NodeGX state; skipped |
| the dictionary | index / IonicToggle B | Bubble element type ionic-IonicToggle has no mapping yet; a Group placeholder stands in |
| the dictionary | index / Input RENT DATE | Bubble element type DateInput has no mapping yet; a Group placeholder stands in |
| the dictionary | index / Input RETURN DATE | Bubble element type DateInput has no mapping yet; a Group placeholder stands in |
| the dictionary | index / IonicIcon B | Bubble element type ionic-IonicIcon has no mapping yet; a Group placeholder stands in |
| the dictionary | index / IonicIcon G | Bubble element type ionic-IonicIcon has no mapping yet; a Group placeholder stands in |
| a person or an AI | index / WonderfulImageSlider A | plugin element Wonderful Image Slider: Wonderful Image Slider (DEPRECATED): its code is in static.js (window.plugins), a kit node is a port |
| the dictionary | index / HTML INSTAGRAM | Bubble element type HTML has no mapping yet; a Group placeholder stands in |
| a person or an AI | index / HTML INSTAGRAM | an HTML element (<div class="embedsocial-hashtag" data-ref="39e6d9f087cd030ab…): raw HTML/CSS, a person decides what it becomes |
| the dictionary | index | search constraint on Listing._id with a dynamic operator |
| the dictionary | index / IonicIcon F | Bubble element type ionic-IonicIcon has no mapping yet; a Group placeholder stands in |
| the dictionary | index / Date/TimePicker Start | Bubble element type DateInput has no mapping yet; a Group placeholder stands in |
| the dictionary | index / Date/TimePicker End | Bubble element type DateInput has no mapping yet; a Group placeholder stands in |
| the dictionary | index / StarRating B | Bubble element type star_rating-StarRating has no mapping yet; a Group placeholder stands in |
| a person or an AI | index / AlphabetImage A | plugin element Alphabet Profile Images: Alphabet Image: its code is in static.js (window.plugins), a kit node is a port |
| a person or an AI | index | a ":filtered" list operator ({"constraints":{"0":{"key":"approved_boolean","value":true,"constraint_type":"eq): JavaScript in the composer's JS view |
| a person or an AI | index | a ":filtered" list operator ({"constraints":{"0":{"key":"approved_boolean","value":true,"constraint_type":"eq): JavaScript in the composer's JS view |
| a person or an AI | index | a ":filtered" list operator ({"constraints":{"0":{"key":"approved_boolean","value":true,"constraint_type":"eq): JavaScript in the composer's JS view |
| a person or an AI | index / WonderfulImageSliderV2 A | plugin element Wonderful Image Slider: Wonderful Image Slider V2: its code is in static.js (window.plugins), a kit node is a port |
| a person or an AI | index | expression operator "round" not in the dictionary (args 1) |
| a person or an AI | index | a ":sorted" list operator ({"descending":true,"sort_field":"distance_number"}): JavaScript in the composer's JS view |
| a person or an AI | index | a ":sorted" list operator ({"descending":true,"sort_field":"distance_number"}): JavaScript in the composer's JS view |
| a person or an AI | index / AlphabetImage D | plugin element Alphabet Profile Images: Alphabet Image: its code is in static.js (window.plugins), a kit node is a port |
| the dictionary | index / Map B | Bubble element type GoogleMap has no mapping yet; a Group placeholder stands in |
| the dictionary | index / StarRating A | Bubble element type star_rating-StarRating has no mapping yet; a Group placeholder stands in |
| a person or an AI | index / AlphabetImage E | plugin element Alphabet Profile Images: Alphabet Image: its code is in static.js (window.plugins), a kit node is a port |
| a person or an AI | index | a ":filtered" list operator ({"constraints":{"0":{"key":"approved_boolean","value":true,"constraint_type":"eq): JavaScript in the composer's JS view |
| a person or an AI | index | a ":filtered" list operator ({"constraints":{"0":{"key":"approved_boolean","value":true,"constraint_type":"eq): JavaScript in the composer's JS view |
| a person or an AI | index | a ":filtered" list operator ({"constraints":{"0":{"key":"approved_boolean","value":true,"constraint_type":"eq): JavaScript in the composer's JS view |
| the dictionary | index / RepeatingGroup related listings | a conditional data source (two sources by condition): one Expression choosing between two queries is the NodeGX way |
| a person or an AI | index / WonderfulImageSlider(DEPRECATED) A | plugin element Wonderful Image Slider: Wonderful Image Slider (DEPRECATED): its code is in static.js (window.plugins), a kit node is a port |
| the dictionary | index / IonicToggle C | Bubble element type ionic-IonicToggle has no mapping yet; a Group placeholder stands in |
| the dictionary | index / IonicIcon H | Bubble element type ionic-IonicIcon has no mapping yet; a Group placeholder stands in |
| the dictionary | index / RepeatingGroup Listing98 v2 | a conditional data source (two sources by condition): one Expression choosing between two queries is the NodeGX way |
| a person or an AI | index / WonderfulImageSlider B | plugin element Wonderful Image Slider: Wonderful Image Slider (DEPRECATED): its code is in static.js (window.plugins), a kit node is a port |
| a person or an AI | index | date-range constraint "range_overlaps" on Booking.bookedDates: no range column type in the backend yet |
| the dictionary | index / Map Bubble ref | Bubble element type GoogleMap has no mapping yet; a Group placeholder stands in |
| a person or an AI | index / googlemap(bdk) B | plugin element Google Maps (bdk): google map (bdk): its code is in static.js (window.plugins), a kit node is a port |
| the dictionary | index / HTML E | Bubble element type HTML has no mapping yet; a Group placeholder stands in |
| a person or an AI | index / HTML E | an HTML element (<ul id="emoji-right">   <li>⛺️</li>   <li>🏂</li>   <li>🚴</…): raw HTML/CSS, a person decides what it becomes |
| the dictionary | index / HTML D | Bubble element type HTML has no mapping yet; a Group placeholder stands in |
| a person or an AI | index / HTML D | an HTML element (<ul id="emoji-left">   <li>⛺️</li>   <li>💪</li>   <li>🏂</l…): raw HTML/CSS, a person decides what it becomes |
| a person or an AI | index / ListofNumbers D | plugin element Toolbox: List of Numbers: its code is in static.js (window.plugins), a kit node is a port |
| the dictionary | index / IonicIcon A | Bubble element type ionic-IonicIcon has no mapping yet; a Group placeholder stands in |
| the dictionary | index / IonicIcon A | Bubble element type ionic-IonicIcon has no mapping yet; a Group placeholder stands in |
| a person or an AI | index | data from the plugin API Stripe.js 2: BFP |
| a person or an AI | index | data from the plugin API Stripe.js 2: BFP |
| the dictionary | index / FileUploader D | Bubble element type FileInput has no mapping yet; a Group placeholder stands in |
| a person or an AI | index | data from the plugin API Stripe Identity API v2: AAP |
| a person or an AI | index | data from the plugin API Stripe Identity API v2: AAP |
| a person or an AI | index | data from the plugin API Stripe Identity API v2: AAP |
| a person or an AI | index | data from the plugin API Stripe Identity API v2: AAP |
| a person or an AI | index | data from the plugin API Stripe Identity API v2: AAP |
| a person or an AI | index | data from the plugin API Stripe Identity API v2: AAP |
| a person or an AI | index | data from the plugin API Stripe Identity API v2: AAP |
| the dictionary | index / FileUploader Upload background check | Bubble element type FileInput has no mapping yet; a Group placeholder stands in |
| the dictionary | index | search constraint on Listing._id with a dynamic operator |
| the dictionary | index / STEP 0 - Expert guide? | a conditional data source (two sources by condition): one Expression choosing between two queries is the NodeGX way |
| the dictionary | index | search constraint on Listing._id with a dynamic operator |
| the dictionary | index / STEP 1 - Equipment | a conditional data source (two sources by condition): one Expression choosing between two queries is the NodeGX way |
| the dictionary | index / Input Security Deposit | conditional "this input isn't valid" has no NodeGX state; skipped |
| the dictionary | index / Map SAFE TRADE SPOTS | Bubble element type GoogleMap has no mapping yet; a Group placeholder stands in |
| the dictionary | index | search constraint on Listing._id with a dynamic operator |
| the dictionary | index / STEP 1.1 - expert guide | a conditional data source (two sources by condition): one Expression choosing between two queries is the NodeGX way |
| the dictionary | index / PictureUploader expert banner | Bubble element type PictureInput has no mapping yet; a Group placeholder stands in |
| a person or an AI | index | "*CREATE LISTING*" is read from /Pages/index (another component): a Component Output is the NodeGX way |
| a person or an AI | index | a ":filtered" list operator ({"constraints":{"0":{"key":"radius_option_op_delivery_radiuses","value":{"type":): JavaScript in the composer's JS view |
| a person or an AI | index | "*CREATE LISTING*" is read from /Pages/index (another component): a Component Output is the NodeGX way |
| a person or an AI | index | "*CREATE LISTING*" is read from /Pages/index (another component): a Component Output is the NodeGX way |
| a person or an AI | index | a ":filtered" list operator ({"constraints":{"0":{"key":"radius_option_op_delivery_radiuses","value":{"type":): JavaScript in the composer's JS view |
| a person or an AI | index | "*CREATE LISTING*" is read from /Pages/index (another component): a Component Output is the NodeGX way |
| a person or an AI | index | "*CREATE LISTING*" is read from /Pages/index (another component): a Component Output is the NodeGX way |
| a person or an AI | index | a ":filtered" list operator ({"constraints":{"0":{"key":"radius_option_op_delivery_radiuses","value":{"type":): JavaScript in the composer's JS view |
| a person or an AI | index | "*CREATE LISTING*" is read from /Pages/index (another component): a Component Output is the NodeGX way |
| a person or an AI | index | "*CREATE LISTING*" is read from /Pages/index (another component): a Component Output is the NodeGX way |
| a person or an AI | index | a ":filtered" list operator ({"constraints":{"0":{"key":"radius_option_op_delivery_radiuses","value":{"type":): JavaScript in the composer's JS view |
| a person or an AI | index | a ":sorted" list operator ({"descending":false,"sort_field":"miles"}): JavaScript in the composer's JS view |
| a person or an AI | index | expression operator "minus_element" not in the dictionary (args {"properties":{"option_set":"option.op_delivery_radiuses","o) |
| a person or an AI | index / 00-LC-Lightbox-RG A | plugin element RG Lightbox: 00-LC-Lightbox-RG: its code is in static.js (window.plugins), a kit node is a port |
| the dictionary | index / Multi-FileUploader listing photos | Bubble element type FileInput has no mapping yet; a Group placeholder stands in |
| the dictionary | index / Multi-FileUploader listing photos | conditional disabled on a FileInput placed as undefined: no such input here |
| the dictionary | index / Input rental price | conditional "this input isn't valid" has no NodeGX state; skipped |
| the dictionary | index / HTML F | Bubble element type HTML has no mapping yet; a Group placeholder stands in |
| a person or an AI | index / HTML F | an HTML element (<ul id="emoji-right">   <li>⛺️</li>   <li>🏂</li>   <li>🚴</…): raw HTML/CSS, a person decides what it becomes |
| the dictionary | index / HTML F | Bubble element type HTML has no mapping yet; a Group placeholder stands in |
| a person or an AI | index / HTML F | an HTML element (<ul id="emoji-left">   <li>⛺️</li>   <li>💪</li>   <li>🏂</l…): raw HTML/CSS, a person decides what it becomes |
| a person or an AI | index / ListofNumbers B | plugin element Toolbox: List of Numbers: its code is in static.js (window.plugins), a kit node is a port |
| the dictionary | index / IonicIcon E | Bubble element type ionic-IonicIcon has no mapping yet; a Group placeholder stands in |
| the dictionary | index / IonicIcon E | Bubble element type ionic-IonicIcon has no mapping yet; a Group placeholder stands in |
| the dictionary | index / HTML A | Bubble element type HTML has no mapping yet; a Group placeholder stands in |
| a person or an AI | index / HTML A | an HTML element (<i><script charset="utf-8" type="text/javascript" src="//js.…): raw HTML/CSS, a person decides what it becomes |
| the dictionary | index | search constraint on Booking._id with a dynamic operator |
| a person or an AI | index | a ":sorted" list operator ({"descending":true,"sort_field":"distance_number"}): JavaScript in the composer's JS view |
| a person or an AI | index / Math.js total price | plugin element Math.js (Local): Math.js: its code is in static.js (window.plugins), a kit node is a port |
| the dictionary | index | search constraint on Booking._id with a dynamic operator |
| the dictionary | index / IonicIcon J | Bubble element type ionic-IonicIcon has no mapping yet; a Group placeholder stands in |
| a person or an AI | index | a ":sorted" list operator ({"descending":true,"sort_field":"distance_number"}): JavaScript in the composer's JS view |
| a person or an AI | index / Math.js Total days | plugin element Math.js (Local): Math.js: its code is in static.js (window.plugins), a kit node is a port |
| a person or an AI | index / Math.js Total rental fee | plugin element Math.js (Local): Math.js: its code is in static.js (window.plugins), a kit node is a port |
| a person or an AI | index / Math.js Grand Total | plugin element Math.js (Local): Math.js: its code is in static.js (window.plugins), a kit node is a port |
| a person or an AI | index / Math.js Stripe fee | plugin element Math.js (Local): Math.js: its code is in static.js (window.plugins), a kit node is a port |
| a person or an AI | index / Math.js platform fee | plugin element Math.js (Local): Math.js: its code is in static.js (window.plugins), a kit node is a port |
| a person or an AI | index / Math.js transfer amount | plugin element Math.js (Local): Math.js: its code is in static.js (window.plugins), a kit node is a port |
| a person or an AI | index / Math.js real grand total +exp | plugin element Math.js (Local): Math.js: its code is in static.js (window.plugins), a kit node is a port |
| the dictionary | index | "Parent group's thing" with no ancestor group holding data |
| a person or an AI | index / WonderfulImageSliderV2 B | plugin element Wonderful Image Slider: Wonderful Image Slider V2: its code is in static.js (window.plugins), a kit node is a port |
| the dictionary | index | "Parent group's thing" with no ancestor group holding data |
| the dictionary | index / StarRating C | Bubble element type star_rating-StarRating has no mapping yet; a Group placeholder stands in |
| a person or an AI | index / AlphabetImage B | plugin element Alphabet Profile Images: Alphabet Image: its code is in static.js (window.plugins), a kit node is a port |
| a person or an AI | index | a ":filtered" list operator ({"constraints":{"0":{"key":"approved_boolean","value":true,"constraint_type":"eq): JavaScript in the composer's JS view |
| the dictionary | index | "Parent group's thing" with no ancestor group holding data |
| a person or an AI | index | expression operator "list_from" not in the dictionary (args {"next":{"type":"Message","name":"custom.image_"},"propertie) |
| the dictionary | index | Go to page: page cmNAG not in the export |
| the dictionary | index | search constraint on User._id with a dynamic operator |
| a person or an AI | index | SendEmail: Bubble sends mail from the server; NodeGX's cloud SendEmail node is the home (subject "New listing created") |
| a person or an AI | index | Schedule API workflow cmaUl: a backend workflow → a cloud function (user, stage) |
| the dictionary | index | search constraint on User._id with a dynamic operator |
| the dictionary | index | search constraint on User._id with a dynamic operator |
| the dictionary | index | ResetInputs: a one-signal action with no exact node yet (chain kept) |
| a person or an AI | index | SendEmail: Bubble sends mail from the server; NodeGX's cloud SendEmail node is the home (subject "") |
| the dictionary | index | search constraint on User._id with a dynamic operator |
| the dictionary | index | ResetInputs: a one-signal action with no exact node yet (chain kept) |
| a person or an AI | index | SendEmail: Bubble sends mail from the server; NodeGX's cloud SendEmail node is the home (subject "") |
| the dictionary | index | ResetInputs: a one-signal action with no exact node yet (chain kept) |
| a person or an AI | index | Schedule API workflow cmXhO: a backend workflow → a cloud function (link, listing, recipient, messageType) |
| the dictionary | index | TerminateWorkflow: a one-signal action with no exact node yet (chain kept) |
| the dictionary | index | Go to page: page cmNAG not in the export |
| the dictionary | index | ListShowNext: a one-signal action with no exact node yet (chain kept) |
| the dictionary | index | ListShowPrevious: a one-signal action with no exact node yet (chain kept) |
| a person or an AI | index | OAuth login with google: NodeGX's SignInWith node needs the provider configured |
| a person or an AI | index | OAuth login with facebook: NodeGX's SignInWith node needs the provider configured |
| the dictionary | index | ScrollToElement: a one-signal action with no exact node yet (chain kept) |
| the dictionary | index | search constraint on User._id with a dynamic operator |
| the dictionary | index | TerminateWorkflow: a one-signal action with no exact node yet (chain kept) |
| a person or an AI | index / Button N ButtonClicked | plugin action AirAlert: AirAlert - Standard: its code is in static.js (window.plugins) |
| the dictionary | index | ResetInputs: a one-signal action with no exact node yet (chain kept) |
| a person or an AI | index | Schedule API workflow cmXhR: a backend workflow → a cloud function (lister, renter, listing, convoType, messageContent) |
| a person or an AI | index | a ":filtered" list operator ({"constraints":{"0":{"key":"listing_custom_listing","value":{"type":"ElementPare): JavaScript in the composer's JS view |
| a person or an AI | index | SendConfirmationEmail: Bubble sends mail from the server; NodeGX's cloud SendEmail node is the home (subject "") |
| a person or an AI | index | Schedule API workflow cmXhO: a backend workflow → a cloud function (link, recipient, messageType) |
| a person or an AI | index / Group Spotlight Icon ButtonClicked | plugin action Amplitude: Amplitude Track Event: its code is in static.js (window.plugins) |
| a person or an AI | index / custom event Pay Booking | plugin action AirAlert: AirAlert - Standard: its code is in static.js (window.plugins) |
| a person or an AI | index | date-range constraint "range_contains" on Booking.bookedDates: no range column type in the backend yet |
| a person or an AI | index | date-range constraint "range_contains" on Booking.bookedDates: no range column type in the backend yet |
| a person or an AI | index | date-range constraint "range_contains" on Booking.bookedDates: no range column type in the backend yet |
| the dictionary | index | TerminateWorkflow: a one-signal action with no exact node yet (chain kept) |
| a person or an AI | index | date-range constraint "range_contains" on Booking.bookedDates: no range column type in the backend yet |
| a person or an AI | index / custom event Pay Booking | action type stripe-ChargeUser has no mapping; a placeholder keeps the chain intact |
| a person or an AI | index | SendEmail: Bubble sends mail from the server; NodeGX's cloud SendEmail node is the home (subject "New booking paid successfully") |
| a person or an AI | index | Schedule API workflow cmXhO: a backend workflow → a cloud function (link, booking, listing, recipient, messageText, messageType) |
| a person or an AI | index | Schedule API workflow cmXhO: a backend workflow → a cloud function (link, booking, listing, recipient, messageText, messageType) |
| a person or an AI | index | Schedule API workflow cmTcy: a backend workflow → a cloud function (booking, listing, cancellink, supportpage) |
| a person or an AI | index | Schedule API workflow cmVOl: a backend workflow → a cloud function (booking) |
| a person or an AI | index workflow cmVKz | event InputChanged on Date/TimePicker Start (DateInput): that element has no such signal here; its actions are converted but nothing fires them |
| a person or an AI | index workflow cmVLD | event InputChanged on Date/TimePicker End (DateInput): that element has no such signal here; its actions are converted but nothing fires them |
| a person or an AI | index | SendConfirmationEmail: Bubble sends mail from the server; NodeGX's cloud SendEmail node is the home (subject "") |
| a person or an AI | index | Schedule API workflow cmXhO: a backend workflow → a cloud function (link, recipient, messageText, messageType) |
| a person or an AI | index / Button X ButtonClicked | plugin action AirAlert: AirAlert - Standard: its code is in static.js (window.plugins) |
| a person or an AI | index workflow cmVnN | plugin event Google Maps (bdk): AAU: its actions are converted but nothing fires them |
| the dictionary | index | search constraint on User._id with a dynamic operator |
| the dictionary | index | TerminateWorkflow: a one-signal action with no exact node yet (chain kept) |
| a person or an AI | index / Button EZ ButtonClicked | plugin action AirAlert: AirAlert - Standard: its code is in static.js (window.plugins) |
| the dictionary | index | ResetInputs: a one-signal action with no exact node yet (chain kept) |
| a person or an AI | index | Schedule API workflow cmXhR: a backend workflow → a cloud function (lister, renter, listing, convoType, messageContent) |
| a person or an AI | index | a ":filtered" list operator ({"constraints":{"0":{"key":"listing_custom_listing","value":{"type":"ElementPare): JavaScript in the composer's JS view |
| a person or an AI | index workflow cmWnm | event InputChanged on Date/TimePicker End (DateInput): that element has no such signal here; its actions are converted but nothing fires them |
| a person or an AI | index workflow cmWnq | event InputChanged on Date/TimePicker Start (DateInput): that element has no such signal here; its actions are converted but nothing fires them |
| the dictionary | index | AnimateElement: a one-signal action with no exact node yet (chain kept) |
| a person or an AI | index / Group JZZZZ ButtonClicked | plugin action TabOpener: Open in a new Tab: its code is in static.js (window.plugins) |
| a person or an AI | index / Group NZZZZ ButtonClicked | plugin action TabOpener: Open in a new Tab: its code is in static.js (window.plugins) |
| a person or an AI | index / Group UZZZZ ButtonClicked | plugin action TabOpener: Open in a new Tab: its code is in static.js (window.plugins) |
| a person or an AI | index / Group EZZZZZ ButtonClicked | plugin action TabOpener: Open in a new Tab: its code is in static.js (window.plugins) |
| a person or an AI | index / Group FZZZZZ ButtonClicked | plugin action TabOpener: Open in a new Tab: its code is in static.js (window.plugins) |
| a person or an AI | index workflow cmWxY | event type MapMarkerClicked not in the event dictionary; its 2 actions were still converted but nothing triggers them |
| the dictionary | index | ResetInputs: a one-signal action with no exact node yet (chain kept) |
| the dictionary | index | AnimateElement: a one-signal action with no exact node yet (chain kept) |
| a person or an AI | index | Schedule API workflow cmXhO: a backend workflow → a cloud function (recipient, messageType) |
| a person or an AI | index | SendEmail: Bubble sends mail from the server; NodeGX's cloud SendEmail node is the home (subject "") |
| a person or an AI | index | Schedule API workflow cmXhO: a backend workflow → a cloud function (recipient, messageType) |
| a person or an AI | index | SendEmail: Bubble sends mail from the server; NodeGX's cloud SendEmail node is the home (subject "") |
| a person or an AI | index | a Formulas expression (CoordToAddress) needs a function |
| the dictionary | index | search constraint on User._id with a dynamic operator |
| a person or an AI | index | SendEmail: Bubble sends mail from the server; NodeGX's cloud SendEmail node is the home (subject "New listing created") |
| the dictionary | index | search constraint on User._id with a dynamic operator |
| the dictionary | index | ResetInputs: a one-signal action with no exact node yet (chain kept) |
| a person or an AI | index | SendEmail: Bubble sends mail from the server; NodeGX's cloud SendEmail node is the home (subject "") |
| the dictionary | index | search constraint on User._id with a dynamic operator |
| the dictionary | index | ResetInputs: a one-signal action with no exact node yet (chain kept) |
| a person or an AI | index | a Formulas expression (CoordToAddress) needs a function |
| a person or an AI | index | a Formulas expression (CoordToAddress) needs a function |
| a person or an AI | index | a Formulas expression (CoordToAddress) needs a function |
| the dictionary | index | "Parent group's thing" with no ancestor group holding data |
| a person or an AI | index | a ":filtered" list operator ({"constraints":{"0":{"key":"distance_number","value":{"next":{"properties":{"ori): JavaScript in the composer's JS view |
| a person or an AI | index | a Formulas expression (CoordToAddress) needs a function |
| the dictionary | index | "Parent group's thing" with no ancestor group holding data |
| the dictionary | index | "Parent group's thing" with no ancestor group holding data |
| the dictionary | index | "Parent group's thing" with no ancestor group holding data |
| the dictionary | index | "Parent group's thing" with no ancestor group holding data |
| the dictionary | index | "Parent group's thing" with no ancestor group holding data |
| a person or an AI | index | a Formulas expression (CoordToAddress) needs a function |
| the dictionary | index | "Parent group's thing" with no ancestor group holding data |
| a person or an AI | index | a ":filtered" list operator ({"constraints":{"0":{"key":"distance_number","value":{"next":{"properties":{"ori): JavaScript in the composer's JS view |
| a person or an AI | index | a Formulas expression (CoordToAddress) needs a function |
| the dictionary | index | "Parent group's thing" with no ancestor group holding data |
| the dictionary | index | "Parent group's thing" with no ancestor group holding data |
| the dictionary | index | "Parent group's thing" with no ancestor group holding data |
| a person or an AI | index | "*CREATE LISTING*" is read from /Pages/index (another component): a Component Output is the NodeGX way |
| a person or an AI | index | a ":filtered" list operator ({"constraints":{"0":{"key":"radius_option_op_delivery_radiuses","value":{"type":): JavaScript in the composer's JS view |
| the dictionary | index | ResetInputs: a one-signal action with no exact node yet (chain kept) |
| a person or an AI | index | "*CREATE LISTING*" is read from /Pages/index (another component): a Component Output is the NodeGX way |
| a person or an AI | index | "*CREATE LISTING*" is read from /Pages/index (another component): a Component Output is the NodeGX way |
| a person or an AI | index | a ":filtered" list operator ({"constraints":{"0":{"key":"radius_option_op_delivery_radiuses","value":{"type":): JavaScript in the composer's JS view |
| a person or an AI | index | "*CREATE LISTING*" is read from /Pages/index (another component): a Component Output is the NodeGX way |
| a person or an AI | index | "*CREATE LISTING*" is read from /Pages/index (another component): a Component Output is the NodeGX way |
| a person or an AI | index | a ":filtered" list operator ({"constraints":{"0":{"key":"radius_option_op_delivery_radiuses","value":{"type":): JavaScript in the composer's JS view |
| the dictionary | index | AnimateElement: a one-signal action with no exact node yet (chain kept) |
| the dictionary | index | AnimateElement: a one-signal action with no exact node yet (chain kept) |
| the dictionary | index | AnimateElement: a one-signal action with no exact node yet (chain kept) |
| the dictionary | index | AnimateElement: a one-signal action with no exact node yet (chain kept) |
| the dictionary | index | ListShowNext: a one-signal action with no exact node yet (chain kept) |
| the dictionary | index | ListShowPrevious: a one-signal action with no exact node yet (chain kept) |
| the dictionary | index | ScrollToElement: a one-signal action with no exact node yet (chain kept) |
| the dictionary | index | Schedule custom event cmYDp after 1s: sent at once (a Timer is the NodeGX way) |
| a person or an AI | index / custom event dezoom_BDKmap | plugin action Google Maps (bdk): AAi: its code is in static.js (window.plugins) |
| the dictionary | index | ScrollToElement: a one-signal action with no exact node yet (chain kept) |
| a person or an AI | index / Icon F ButtonClicked | action type DeleteUploadedFile has no mapping; a placeholder keeps the chain intact |
| a person or an AI | index | "*CREATE LISTING*" is read from /Pages/index (another component): a Component Output is the NodeGX way |
| a person or an AI | index / Button W ButtonClicked | API Connector call cmPnN.cmPnO: an HTTP node with the call's url/method/headers from settings.apiconnector2 |
| a person or an AI | index / Button W ButtonClicked | API Connector call cmPnN.cmPnT: an HTTP node with the call's url/method/headers from settings.apiconnector2 |
| a person or an AI | index / Button GZ ButtonClicked | action type stripe-GetUserCCInfo has no mapping; a placeholder keeps the chain intact |
| a person or an AI | index / Button P ButtonClicked | plugin action Stripe Identity API v2: AAc: its code is in static.js (window.plugins) |
| a person or an AI | index | data from the plugin API Stripe Identity API v2: AAP |
| the dictionary | index | TerminateWorkflow: a one-signal action with no exact node yet (chain kept) |
| a person or an AI | index | data from the plugin API Stripe Identity API v2: AAP |
| a person or an AI | index / Button P ButtonClicked | plugin action Stripe Identity API v2: AAS: its code is in static.js (window.plugins) |
| a person or an AI | index / Group Spotlight Mobile Search ButtonClicked | plugin action Amplitude: Amplitude Track Event: its code is in static.js (window.plugins) |
| the dictionary | index | ResetGroup: a one-signal action with no exact node yet (chain kept) |
| a person or an AI | index workflow cmbtG | plugin event  Air Date / Time Picker: ADK: its actions are converted but nothing fires them |
| a person or an AI | index workflow cmbuh | plugin event  Air Date / Time Picker: ADK: its actions are converted but nothing fires them |
| a person or an AI | index workflow cmbvz | event type PopupClosed not in the event dictionary; its 3 actions were still converted but nothing triggers them |
| the dictionary | index | ResetGroup: a one-signal action with no exact node yet (chain kept) |
| the dictionary | index | PauseWFClient: a one-signal action with no exact node yet (chain kept) |
| the dictionary | index | ResetGroup: a one-signal action with no exact node yet (chain kept) |
| a person or an AI | index / Group GZZ ButtonClicked | plugin action TabOpener: Open in a new Tab: its code is in static.js (window.plugins) |
| a person or an AI | index / Group GZZ ButtonClicked | plugin action TabOpener: Open in a new Tab: its code is in static.js (window.plugins) |
| a person or an AI | index / Group GZZ ButtonClicked | plugin action TabOpener: Open in a new Tab: its code is in static.js (window.plugins) |
| a person or an AI | index / Group GZZ ButtonClicked | plugin action TabOpener: Open in a new Tab: its code is in static.js (window.plugins) |
| a person or an AI | index / Group GZZ ButtonClicked | plugin action TabOpener: Open in a new Tab: its code is in static.js (window.plugins) |
| a person or an AI | index | HideElement GroupFocus A: the element lives in /Pages/index, another component; a Component Input/Output carries that |
| the dictionary | index | ScrollToElement: a one-signal action with no exact node yet (chain kept) |
| the dictionary | index | Schedule custom event Pay Booking after 0.5s: sent at once (a Timer is the NodeGX way) |
| the dictionary | index | Schedule custom event Pay Booking after 0.5s: sent at once (a Timer is the NodeGX way) |
| a person or an AI | index / Button E ButtonClicked | plugin action Stripe Identity API v2: AAc: its code is in static.js (window.plugins) |
| a person or an AI | index | data from the plugin API Stripe Identity API v2: AAP |
| the dictionary | index | TerminateWorkflow: a one-signal action with no exact node yet (chain kept) |
| a person or an AI | index | data from the plugin API Stripe Identity API v2: AAP |
| a person or an AI | index / Button E ButtonClicked | plugin action Stripe Identity API v2: AAS: its code is in static.js (window.plugins) |
| a person or an AI | index | SendEmail: Bubble sends mail from the server; NodeGX's cloud SendEmail node is the home (subject "Stripe identity verification complete") |
| a person or an AI | index / Page is loaded | plugin action RG Lightbox: ACM: its code is in static.js (window.plugins) |
| a person or an AI | index / Page is loaded | plugin action Amplitude: Amplitude Set User: its code is in static.js (window.plugins) |
| a person or an AI | index | Current Position (geolocation): a Geolocation node is the NodeGX way |
| the dictionary | index | TerminateWorkflow: a one-signal action with no exact node yet (chain kept) |
| the dictionary | index | Schedule custom event Pay Booking after 0.5s: sent at once (a Timer is the NodeGX way) |
| the dictionary | index | ScrollToElement: a one-signal action with no exact node yet (chain kept) |
| a person or an AI | index / Button C ButtonClicked | plugin action AirAlert: AirAlert - Standard: its code is in static.js (window.plugins) |
| the dictionary | index | TerminateWorkflow: a one-signal action with no exact node yet (chain kept) |
| a person or an AI | index | SendPasswordResetEmail: Bubble sends mail from the server; NodeGX's cloud SendEmail node is the home (subject "") |
| a person or an AI | index | Schedule API workflow cmXhO: a backend workflow → a cloud function (link, recipient, messageType) |
| the dictionary | index | AnimateElement: a one-signal action with no exact node yet (chain kept) |
| the dictionary | index | ResetGroup: a one-signal action with no exact node yet (chain kept) |
| the dictionary | index | PauseWFClient: a one-signal action with no exact node yet (chain kept) |
| the dictionary | index | ResetGroup: a one-signal action with no exact node yet (chain kept) |
| the dictionary | index | Schedule custom event dezoom_BDKmap after 1s: sent at once (a Timer is the NodeGX way) |
| the dictionary | index | Schedule custom event dezoom_BDKmap after 1s: sent at once (a Timer is the NodeGX way) |
| a person or an AI | index workflow cmYdb0 | event InputChanged on Multi-FileUploader listing photos (FileInput): that element has no such signal here; its actions are converted but nothing fires them |
| a person or an AI | index | SendEmail: Bubble sends mail from the server; NodeGX's cloud SendEmail node is the home (subject "") |
| the dictionary | index | ResetInputs: a one-signal action with no exact node yet (chain kept) |
| the dictionary | index | AnimateElement: a one-signal action with no exact node yet (chain kept) |
| the dictionary | blog_details | Current page thing: a page-level record parameter (a query by the id in the URL is the NodeGX way) |
| the dictionary | faqs | Toggle element FAQ Answer: set to true in this spike; needs an inverter |
| the dictionary | reset_pw | Reset password: the "confirm password" check is Bubble-side; add a Condition comparing the two inputs before the reset |
| a person or an AI | sandbox_osborne_solutions | Schedule API workflow cmXhO: a backend workflow → a cloud function (recipient, messageText, messageType) |
| a person or an AI | sandbox_osborne_solutions | Schedule API workflow cmXhO: a backend workflow → a cloud function (recipient, messageType) |
| a person or an AI | stripe_auth / Button B ButtonClicked | API Connector call cmPnN.cmPnT: an HTTP node with the call's url/method/headers from settings.apiconnector2 |
| a person or an AI | user_dashboard / AlphabetImage A | plugin element Alphabet Profile Images: Alphabet Image: its code is in static.js (window.plugins), a kit node is a port |
| a person or an AI | user_dashboard | a ":filtered" list operator ({"constraints":{"0":{"key":"readby_list_user","value":{"type":"CurrentUser","is_): JavaScript in the composer's JS view |
| a person or an AI | user_dashboard | a ":filtered" list operator ({"constraints":{"0":{"key":"readby_list_user","value":{"type":"CurrentUser","is_): JavaScript in the composer's JS view |
| the dictionary | user_dashboard / HTML A | Bubble element type HTML has no mapping yet; a Group placeholder stands in |
| a person or an AI | user_dashboard / HTML A | an HTML element (<style> #home-bg { /* background: var(--page-gradient-dark-m…): raw HTML/CSS, a person decides what it becomes |
| the dictionary | user_dashboard / HTML B HUBSPOT | Bubble element type HTML has no mapping yet; a Group placeholder stands in |
| a person or an AI | user_dashboard / HTML B HUBSPOT | an HTML element (<style>  #hubspot-messages-iframe-container{ /*float: left !…): raw HTML/CSS, a person decides what it becomes |
| a person or an AI | user_dashboard | "RepeatingGroup C" is read from /Pages/user_dashboard (another component): a Component Output is the NodeGX way |
| the dictionary | user_dashboard / RepeatingGroup B | a conditional data source (two sources by condition): one Expression choosing between two queries is the NodeGX way |
| the dictionary | user_dashboard / RepeatingGroup B | a conditional data source (two sources by condition): one Expression choosing between two queries is the NodeGX way |
| a person or an AI | user_dashboard | a ":sorted" list operator ({"descending":true,"sort_field":"Created Date"}): JavaScript in the composer's JS view |
| a person or an AI | user_dashboard | a ":filtered" list operator ({"constraints":{"0":{"key":"Created By","value":{"type":"CurrentUser"},"constrai): JavaScript in the composer's JS view |
| a person or an AI | user_dashboard | "RepeatingGroup OP_user listing status V2" is read from /Pages/user_dashboard (another component): a Component Output is the NodeGX way |
| the dictionary | user_dashboard / RepeatingGroup Listing V2 | a conditional data source (two sources by condition): one Expression choosing between two queries is the NodeGX way |
| the dictionary | user_dashboard / RepeatingGroup Listing V2 | a conditional data source (two sources by condition): one Expression choosing between two queries is the NodeGX way |
| the dictionary | user_dashboard / RepeatingGroup Listing V2 | a conditional data source (two sources by condition): one Expression choosing between two queries is the NodeGX way |
| the dictionary | user_dashboard / RepeatingGroup Listing V2 | a conditional data source (two sources by condition): one Expression choosing between two queries is the NodeGX way |
| a person or an AI | user_dashboard | "RepeatingGroup D" is read from /Pages/user_dashboard (another component): a Component Output is the NodeGX way |
| the dictionary | user_dashboard / RepeatingGroup Booking v2 | a conditional data source (two sources by condition): one Expression choosing between two queries is the NodeGX way |
| the dictionary | user_dashboard / RepeatingGroup Booking v2 | a conditional data source (two sources by condition): one Expression choosing between two queries is the NodeGX way |
| the dictionary | user_dashboard / RepeatingGroup Booking v2 | a conditional data source (two sources by condition): one Expression choosing between two queries is the NodeGX way |
| the dictionary | user_dashboard / Delivery Location | a Link to a URL became a Text; its destination ({"entries":{"0":"https://www.google.com/maps/search/?api=1&query=","1":{"next":{) is not wired |
| the dictionary | user_dashboard / Delivery Location | a Link to a URL became a Text; its destination ({"entries":{"0":"https://www.google.com/maps/search/?api=1&query=","1":{"next":{) is not wired |
| the dictionary | user_dashboard / Delivery Location | a Link to a URL became a Text; its destination ({"entries":{"0":"https://www.google.com/maps/search/?api=1&query=","1":{"next":{) is not wired |
| a person or an AI | user_dashboard | a ":sorted" list operator ({"descending":true,"sort_field":"fromdate_date"}): JavaScript in the composer's JS view |
| a person or an AI | user_dashboard | "RepeatingGroup E" is read from /Pages/user_dashboard (another component): a Component Output is the NodeGX way |
| a person or an AI | user_dashboard / ListofNumbers A | plugin element Toolbox: List of Numbers: its code is in static.js (window.plugins), a kit node is a port |
| a person or an AI | user_dashboard | a ":filtered" list operator ({"constraints":{"0":{"key":"category_custom_categories","value":{"next":{"type":): JavaScript in the composer's JS view |
| a person or an AI | user_dashboard | a ":sorted" list operator ({"descending":true,"sort_field":"Created Date"}): JavaScript in the composer's JS view |
| the dictionary | user_dashboard / PictureUploader A | Bubble element type PictureInput has no mapping yet; a Group placeholder stands in |
| the dictionary | user_dashboard / PictureUploader A | conditional src on a PictureInput placed as undefined: no such input here |
| a person or an AI | user_dashboard | data from the plugin API Stripe.js 2: BFP |
| a person or an AI | user_dashboard | data from the plugin API Stripe.js 2: BFP |
| the dictionary | user_dashboard / FileUploader C | Bubble element type FileInput has no mapping yet; a Group placeholder stands in |
| the dictionary | user_dashboard / Link C | a Link to a URL became a Text; its destination ({"entries":{"0":{"next":{"next":{"type":"Message","name":"file_file"},"type":"Me) is not wired |
| the dictionary | user_dashboard / FileUploader A | Bubble element type FileInput has no mapping yet; a Group placeholder stands in |
| the dictionary | user_dashboard / Link A | a Link to a URL became a Text; its destination ({"entries":{"0":{"next":{"next":{"type":"Message","name":"file_file"},"type":"Me) is not wired |
| the dictionary | user_dashboard / FileUploader B | Bubble element type FileInput has no mapping yet; a Group placeholder stands in |
| the dictionary | user_dashboard / Link B | a Link to a URL became a Text; its destination ({"entries":{"0":{"next":{"next":{"type":"Message","name":"file_file"},"type":"Me) is not wired |
| a person or an AI | user_dashboard / bettertoggle A | plugin element Missing plugin: better toggle: its code is in static.js (window.plugins), a kit node is a port |
| the dictionary | user_dashboard / MaterialIcon A | Bubble element type materialicons-Materialicon has no mapping yet; a Group placeholder stands in |
| the dictionary | user_dashboard / MaterialIcon A | Bubble element type materialicons-Materialicon has no mapping yet; a Group placeholder stands in |
| the dictionary | user_dashboard / MaterialIcon A | Bubble element type materialicons-Materialicon has no mapping yet; a Group placeholder stands in |
| the dictionary | user_dashboard / MaterialIcon A | Bubble element type materialicons-Materialicon has no mapping yet; a Group placeholder stands in |
| the dictionary | user_dashboard / MaterialIcon A | Bubble element type materialicons-Materialicon has no mapping yet; a Group placeholder stands in |
| a person or an AI | user_dashboard | a ":filtered" list operator ({"constraints":{"0":{"key":"_advanced_search_constraint","value":{"next":{"next"): JavaScript in the composer's JS view |
| a person or an AI | user_dashboard | "RepeatingGroup OP_user listing status V2 archive" is read from /Pages/user_dashboard (another component): a Component Output is the NodeGX way |
| a person or an AI | user_dashboard / Button C ButtonClicked | plugin action AirAlert: AirAlert - Standard: its code is in static.js (window.plugins) |
| a person or an AI | user_dashboard workflow cmOHS | event InputChanged on PictureUploader A (PictureInput): that element has no such signal here; its actions are converted but nothing fires them |
| a person or an AI | user_dashboard / Button F ButtonClicked | API Connector call cmPnN.cmPnO: an HTTP node with the call's url/method/headers from settings.apiconnector2 |
| a person or an AI | user_dashboard / Button F ButtonClicked | API Connector call cmPnN.cmPnT: an HTTP node with the call's url/method/headers from settings.apiconnector2 |
| a person or an AI | user_dashboard | SendEmail: Bubble sends mail from the server; NodeGX's cloud SendEmail node is the home (subject "") |
| the dictionary | user_dashboard | ResetInputs: a one-signal action with no exact node yet (chain kept) |
| a person or an AI | user_dashboard / Button Save utility bill ButtonClicked | plugin action AirAlert: AirAlert - Standard: its code is in static.js (window.plugins) |
| a person or an AI | user_dashboard / Button L ButtonClicked | action type stripe-GetUserCCInfo has no mapping; a placeholder keeps the chain intact |
| the dictionary | user_dashboard | ListShowNext: a one-signal action with no exact node yet (chain kept) |
| the dictionary | user_dashboard | ListShowPrevious: a one-signal action with no exact node yet (chain kept) |
| the dictionary | user_dashboard | ResetInputs: a one-signal action with no exact node yet (chain kept) |
| a person or an AI | user_dashboard / Button Save background check ButtonClicked | plugin action AirAlert: AirAlert - Standard: its code is in static.js (window.plugins) |
| a person or an AI | user_dashboard / Button Save background check ButtonClicked | plugin action SendGrid: SendGrid - Send plain-text email: its code is in static.js (window.plugins) |
| a person or an AI | user_dashboard | SendEmail: Bubble sends mail from the server; NodeGX's cloud SendEmail node is the home (subject "") |
| the dictionary | user_dashboard | TerminateWorkflow: a one-signal action with no exact node yet (chain kept) |
| a person or an AI | user_dashboard | SendEmail: Bubble sends mail from the server; NodeGX's cloud SendEmail node is the home (subject "") |
| the dictionary | user_dashboard | ResetInputs: a one-signal action with no exact node yet (chain kept) |
| a person or an AI | user_dashboard / Button Save identity doc ButtonClicked | plugin action AirAlert: AirAlert - Standard: its code is in static.js (window.plugins) |
| a person or an AI | user_dashboard / custom event showStatusBar | plugin action myAlerts!: 5. Custom Toast: its code is in static.js (window.plugins) |
| a person or an AI | user_dashboard / custom event showStatusBar | plugin action myAlerts!: 5. Custom Toast: its code is in static.js (window.plugins) |
| a person or an AI | user_dashboard / custom event showStatusBar | plugin action myAlerts!: 5. Custom Toast: its code is in static.js (window.plugins) |
| the dictionary | user_dashboard | TerminateWorkflow: a one-signal action with no exact node yet (chain kept) |
| a person or an AI | user_dashboard / custom event showStatusBar | plugin action myAlerts!: 5. Custom Toast: its code is in static.js (window.plugins) |
| a person or an AI | user_dashboard / custom event showStatusBar | plugin action myAlerts!: 5. Custom Toast: its code is in static.js (window.plugins) |
| a person or an AI | user_dashboard / custom event showStatusBar | plugin action myAlerts!: 5. Custom Toast: its code is in static.js (window.plugins) |
| a person or an AI | user_dashboard / custom event showStatusBar | plugin action myAlerts!: 5. Custom Toast: its code is in static.js (window.plugins) |
| the dictionary | user_dashboard | ListShowNext: a one-signal action with no exact node yet (chain kept) |
| the dictionary | user_dashboard | ListShowPrevious: a one-signal action with no exact node yet (chain kept) |
| the dictionary | user_dashboard | ListShowNext: a one-signal action with no exact node yet (chain kept) |
| the dictionary | user_dashboard | ListShowPrevious: a one-signal action with no exact node yet (chain kept) |
| the dictionary | user_dashboard | ListShowNext: a one-signal action with no exact node yet (chain kept) |
| the dictionary | user_dashboard | ListShowPrevious: a one-signal action with no exact node yet (chain kept) |
| a person or an AI | user_dashboard | ShowElement Popup help text A: the element lives in /Pages/user_dashboard, another component; a Component Input/Output carries that |
| the dictionary | user_dashboard | Update credentials: a new password needs the ResetPassword flow; only the email is set |
| a person or an AI | user_dashboard workflow cmOPn1 | plugin event Missing plugin: AAI: its actions are converted but nothing fires them |
| a person or an AI | user_dashboard | expression operator "not_contains" not in the dictionary (args {"type":"ElementParent"}) |
| a person or an AI | user_dashboard / Current Listings copy ButtonClicked | action type DownloadDataAsCSV has no mapping; a placeholder keeps the chain intact |
| a person or an AI | user_dashboard_backup / AlphabetImage A | plugin element Alphabet Profile Images: Alphabet Image: its code is in static.js (window.plugins), a kit node is a port |
| a person or an AI | user_dashboard_backup | "RepeatingGroup C" is read from /Pages/user_dashboard_backup (another component): a Component Output is the NodeGX way |
| the dictionary | user_dashboard_backup / RepeatingGroup B | a conditional data source (two sources by condition): one Expression choosing between two queries is the NodeGX way |
| the dictionary | user_dashboard_backup / RepeatingGroup B | a conditional data source (two sources by condition): one Expression choosing between two queries is the NodeGX way |
| a person or an AI | user_dashboard_backup | a ":sorted" list operator ({"descending":true,"sort_field":"Created Date"}): JavaScript in the composer's JS view |
| a person or an AI | user_dashboard_backup | a ":filtered" list operator ({"constraints":{"0":{"key":"Created By","value":{"type":"CurrentUser"},"constrai): JavaScript in the composer's JS view |
| a person or an AI | user_dashboard_backup | "RepeatingGroup D" is read from /Pages/user_dashboard_backup (another component): a Component Output is the NodeGX way |
| the dictionary | user_dashboard_backup / $25 / day | a Link to a URL became a Text; its destination ({"entries":{"0":"https://www.google.com/maps/search/?api=1&query=","1":{"next":{) is not wired |
| a person or an AI | user_dashboard_backup | a ":sorted" list operator ({"descending":true,"sort_field":"fromdate_date"}): JavaScript in the composer's JS view |
| a person or an AI | user_dashboard_backup | "RepeatingGroup E" is read from /Pages/user_dashboard_backup (another component): a Component Output is the NodeGX way |
| a person or an AI | user_dashboard_backup / ListofNumbers A | plugin element Toolbox: List of Numbers: its code is in static.js (window.plugins), a kit node is a port |
| a person or an AI | user_dashboard_backup | a ":filtered" list operator ({"constraints":{"0":{"key":"category_custom_categories","value":{"next":{"type":): JavaScript in the composer's JS view |
| a person or an AI | user_dashboard_backup | a ":sorted" list operator ({"descending":true,"sort_field":"Created Date"}): JavaScript in the composer's JS view |
| the dictionary | user_dashboard_backup / PictureUploader A | Bubble element type PictureInput has no mapping yet; a Group placeholder stands in |
| the dictionary | user_dashboard_backup / PictureUploader A | conditional src on a PictureInput placed as undefined: no such input here |
| a person or an AI | user_dashboard_backup | data from the plugin API Stripe.js 2: BFP |
| a person or an AI | user_dashboard_backup | data from the plugin API Stripe.js 2: BFP |
| the dictionary | user_dashboard_backup / FileUploader C | Bubble element type FileInput has no mapping yet; a Group placeholder stands in |
| the dictionary | user_dashboard_backup / Link C | a Link to a URL became a Text; its destination ({"entries":{"0":{"next":{"next":{"type":"Message","name":"file_file"},"type":"Me) is not wired |
| the dictionary | user_dashboard_backup / FileUploader A | Bubble element type FileInput has no mapping yet; a Group placeholder stands in |
| the dictionary | user_dashboard_backup / Link A | a Link to a URL became a Text; its destination ({"entries":{"0":{"next":{"next":{"type":"Message","name":"file_file"},"type":"Me) is not wired |
| the dictionary | user_dashboard_backup / FileUploader B | Bubble element type FileInput has no mapping yet; a Group placeholder stands in |
| the dictionary | user_dashboard_backup / Link B | a Link to a URL became a Text; its destination ({"entries":{"0":{"next":{"next":{"type":"Message","name":"file_file"},"type":"Me) is not wired |
| the dictionary | user_dashboard_backup / Input old password | conditional "this input isn't valid" has no NodeGX state; skipped |
| the dictionary | user_dashboard_backup / Input new password | conditional "this input isn't valid" has no NodeGX state; skipped |
| the dictionary | user_dashboard_backup / Input D | conditional "this input isn't valid" has no NodeGX state; skipped |
| a person or an AI | user_dashboard_backup / bettertoggle A | plugin element Missing plugin: better toggle: its code is in static.js (window.plugins), a kit node is a port |
| a person or an AI | user_dashboard_backup / Button C ButtonClicked | plugin action AirAlert: AirAlert - Standard: its code is in static.js (window.plugins) |
| a person or an AI | user_dashboard_backup workflow cmfEi | event InputChanged on PictureUploader A (PictureInput): that element has no such signal here; its actions are converted but nothing fires them |
| a person or an AI | user_dashboard_backup / Button F ButtonClicked | API Connector call cmPnN.cmPnO: an HTTP node with the call's url/method/headers from settings.apiconnector2 |
| a person or an AI | user_dashboard_backup / Button F ButtonClicked | API Connector call cmPnN.cmPnT: an HTTP node with the call's url/method/headers from settings.apiconnector2 |
| a person or an AI | user_dashboard_backup | SendEmail: Bubble sends mail from the server; NodeGX's cloud SendEmail node is the home (subject "") |
| the dictionary | user_dashboard_backup | ResetInputs: a one-signal action with no exact node yet (chain kept) |
| a person or an AI | user_dashboard_backup / Button Save utility bill ButtonClicked | plugin action AirAlert: AirAlert - Standard: its code is in static.js (window.plugins) |
| a person or an AI | user_dashboard_backup / Button L ButtonClicked | action type stripe-GetUserCCInfo has no mapping; a placeholder keeps the chain intact |
| the dictionary | user_dashboard_backup | ListShowNext: a one-signal action with no exact node yet (chain kept) |
| the dictionary | user_dashboard_backup | ListShowPrevious: a one-signal action with no exact node yet (chain kept) |
| the dictionary | user_dashboard_backup | ResetInputs: a one-signal action with no exact node yet (chain kept) |
| a person or an AI | user_dashboard_backup / Button Save background check ButtonClicked | plugin action AirAlert: AirAlert - Standard: its code is in static.js (window.plugins) |
| a person or an AI | user_dashboard_backup / Button Save background check ButtonClicked | plugin action SendGrid: SendGrid - Send plain-text email: its code is in static.js (window.plugins) |
| a person or an AI | user_dashboard_backup | SendEmail: Bubble sends mail from the server; NodeGX's cloud SendEmail node is the home (subject "") |
| the dictionary | user_dashboard_backup | TerminateWorkflow: a one-signal action with no exact node yet (chain kept) |
| a person or an AI | user_dashboard_backup | SendEmail: Bubble sends mail from the server; NodeGX's cloud SendEmail node is the home (subject "") |
| the dictionary | user_dashboard_backup | ResetInputs: a one-signal action with no exact node yet (chain kept) |
| a person or an AI | user_dashboard_backup / Button Save identity doc ButtonClicked | plugin action AirAlert: AirAlert - Standard: its code is in static.js (window.plugins) |
| a person or an AI | user_dashboard_backup / custom event showStatusBar | plugin action myAlerts!: 5. Custom Toast: its code is in static.js (window.plugins) |
| a person or an AI | user_dashboard_backup / custom event showStatusBar | plugin action myAlerts!: 5. Custom Toast: its code is in static.js (window.plugins) |
| a person or an AI | user_dashboard_backup / custom event showStatusBar | plugin action myAlerts!: 5. Custom Toast: its code is in static.js (window.plugins) |
| the dictionary | user_dashboard_backup | TerminateWorkflow: a one-signal action with no exact node yet (chain kept) |
| a person or an AI | user_dashboard_backup / custom event showStatusBar | plugin action myAlerts!: 5. Custom Toast: its code is in static.js (window.plugins) |
| a person or an AI | user_dashboard_backup / custom event showStatusBar | plugin action myAlerts!: 5. Custom Toast: its code is in static.js (window.plugins) |
| a person or an AI | user_dashboard_backup / custom event showStatusBar | plugin action myAlerts!: 5. Custom Toast: its code is in static.js (window.plugins) |
| a person or an AI | user_dashboard_backup / custom event showStatusBar | plugin action myAlerts!: 5. Custom Toast: its code is in static.js (window.plugins) |
| the dictionary | user_dashboard_backup | Update credentials: a new password needs the ResetPassword flow; only the email is set |
| a person or an AI | user_dashboard_backup workflow cmfIR | plugin event Missing plugin: AAI: its actions are converted but nothing fires them |
| a person or an AI | user_dashboard_backup | expression operator "not_contains" not in the dictionary (args {"type":"ElementParent"}) |
