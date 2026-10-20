# Translation spec — driver's test study app

Audience: teenagers and adults, many recent immigrants/refugees, preparing for the state driver knowledge test.
Register: plain, friendly, clear. Short sentences. Use standard, widely understood forms of the language
(Spanish: neutral Latin American; Arabic: Modern Standard Arabic; Chinese: Simplified, Mainland usage;
Russian: standard; Swahili: standard East African Kiswahili).

Rules:
- Translate meaning exactly. These are traffic laws: never soften, strengthen, or change a rule or a number.
- Keep every number, unit value, and JSON key exactly. Translate unit WORDS (feet → pies, etc.) but do NOT convert units.
- Keep {placeholders} like {n} exactly as-is.
- Keep MUTCD codes, agency names, state and place names, phone numbers like "511", URLs untouched. Proper names of programs (e.g. "Alive at 25") stay in English,
  optionally with a short translation in parentheses.
- Text that appears ON a sign (STOP, YIELD, DO NOT ENTER, ONE WAY, etc.): keep the English sign text in quotes
  and add the meaning in the target language, e.g. Spanish: «el letrero "YIELD" (Ceda el paso)». The real signs are in English.
- Multiple-choice: translate each choice; do NOT reorder choices (the "answer" index must stay valid).
- Never translate or alter: id, topic, page, weight, sign, type, answer, unit-less numbers.
- Translate "example" like the other text fields. If the English fact has one, the translation must too (the build checks).
- Output must be valid JSON (UTF-8, not escaped). Validate with python3 -I -c "import json,sys;json.load(open(sys.argv[1]))" FILE
