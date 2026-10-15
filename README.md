# ScamShield Naija

Paste a suspicious SMS or email and get a verdict, a risk level and plain-language reasons, in **English or Nigerian Pidgin**. It is built for scams common in Nigeria: fake bank alerts asking for a BVN, OTP or PIN, "you've won" prizes, investment schemes, fake jobs with a "registration fee", and loan scams.

## Why

ScamShield started from a personal loss: the author was scammed and had no simple tool to check a message before acting. Most scam detectors target Western phishing and none speak Nigerian Pidgin. This one explains *why* a message looks like a scam, in a language people actually use. See `devpost-story.md` for the full story.

## Example

Input: `Your account will be blocked. Send your BVN now.`
Result: verdict **Bank phishing**, high risk, with reasons such as "It asks for your BVN, OTP, PIN, card details or account number" and "It threatens that your account, card or SIM will be blocked", plus advice on what to do next.

## How it works

1. The message goes to the FastAPI backend (`POST /analyze`).
2. A scikit-learn model classifies it into one of seven labels: `safe`, `bank_phishing`, `fake_job`, `loan_scam`, `prize_scam`, `investment_scam`, `other_scam`.
3. Hand-written rules detect concrete signals (asks for secrets, upfront fee, guaranteed returns, urgency, account threats, untrusted or shortened links, and others). Each triggered signal becomes a reason shown to the user, so every explanation ties back to something in the message.
4. Optionally, an OpenAI-compatible LLM rewrites the explanation in 2-3 sentences. Without an LLM key the API returns rule-based explanations only.

## Repo layout

```
api/main.py        FastAPI app: /analyze, /health, CORS, per-IP rate limit, LLM explanation
ml/model.py        ScamShield class: TF-IDF (word + char n-grams) + rule features -> logistic regression
ml/rules.py        Regex rules and link checks (signals and features)
ml/train.py        Cross-validation experiments on the hand-reviewed set
ml/model.joblib    Trained model (loaded by the API)
data/              Training data (see below)
frontend/          React 19 + Vite + Tailwind 4 app (English/Pidgin UI)
Dockerfile         Container for Google Cloud Run
```

## Detected signals

Rules live in `ml/rules.py` and are matched on the lowercased message (first 1500 characters):

| Signal | What it looks for |
|---|---|
| `asks_secret` | BVN, OTP, PIN, CVV, password or card details being requested |
| `fee_first` | Paying a fee, tax, insurance or registration charge up front |
| `guaranteed_return` | Guaranteed or doubled returns, daily or weekly profit |
| `prize_claim` | "You won" prizes, lotteries, giveaways |
| `job_offer`, `loan_offer`, `grant_offer`, `earn_online` | Job, loan, grant and work-from-home lures |
| `airtime_request` | Asking you to buy airtime or data first |
| `urgency`, `account_threat` | Deadlines and threats to block, suspend or freeze an account |
| `secrecy_or_family` | Impersonation of family, "new number", inheritance and next-of-kin stories |
| `untrusted_link`, `shortener` | Links outside a trusted-domain list, and URL shorteners |
| `legit_alert_format` | Plain debit/credit alert format with no links (lowers suspicion) |
| `pidgin` | Detects Pidgin text; used as a feature only, never shown as a reason |

## Model and data

- **Features:** word 1-2-gram and character 2-4-gram TF-IDF, plus rule features scaled by 3.
- **Classifier:** logistic regression (`class_weight="balanced"`, `C=5`).
- **Training data:** the public UCI SMS spam set, down-sampled to 300 rows per class so it doesn't drown out the signal, plus `data/handmade_all.csv` (105 hand-reviewed Nigerian messages across the seven labels), each weighted 15x.
- **Held-out set:** `data/heldout_v1.csv` (15 messages).
- `data/UCI_README.txt` holds the UCI dataset's licence and citation.

Retrain from the repo root with `python -m ml.model` (writes `ml/model.joblib`).

> **Known gap:** `ml/model.py` and `ml/train.py` read `data/combined_v2.csv`, which is not in the repo. Retraining needs that file (the public data, labelled with the same seven classes). The committed `ml/model.joblib` works as is. The raw Kaggle email data is deliberately not published (see `.gitignore`).

## API

Run locally from the repo root:

```bash
pip install -r requirements.txt
uvicorn api.main:app --reload      # http://localhost:8000
```

### `GET /health`
Returns `{"status": "ok", "llm": <bool>}`.

### `POST /analyze`

Request:
```json
{ "text": "Your account will be blocked. Send your BVN now.", "lang": "en", "explain_with_llm": true }
```
- `text`: 3-2000 characters.
- `lang`: `en` (English) or `pcm` (Nigerian Pidgin).
- `explain_with_llm`: optional, default `true`; ignored if no LLM key is set.

Response fields: `verdict` (display name), `label`, `is_scam`, `confidence`, `scam_probability`, `top3` (best three labels with probabilities), `signals` (triggered rule ids), `reasons` (plain-language list in the requested language), `advice`, `explanation` (LLM text or `null`), `explanation_source` (`"llm"` or `"rules"`).

Errors: `422` for invalid input, `429` when the rate limit is hit.

### Configuration (environment variables)

| Variable | Default | Purpose |
|---|---|---|
| `ALLOWED_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5173` | Comma-separated origins allowed by CORS |
| `RATE_LIMIT_PER_MIN` | `20` | Per-IP requests per minute (in-memory, single instance) |
| `LLM_API_KEY` | unset | Enables LLM explanations |
| `LLM_BASE_URL` | `https://api.featherless.ai/v1` | Any OpenAI-compatible endpoint |
| `LLM_MODEL` | `meta-llama/Meta-Llama-3.1-8B-Instruct` | Model name |

The LLM prompt treats the user's message as untrusted data and tells the model to ignore instructions inside it and to never repeat links or phone numbers. If the LLM call fails, the API falls back to rule-based text.

## Frontend

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
npm run build      # outputs dist/
```

Set `VITE_API_URL` to the API's URL (default `http://localhost:8000`). The UI supports English and Nigerian Pidgin switching. Source is in `frontend/src`: `App.jsx` (input and layout), `Result.jsx` (verdict, risk, reasons), `i18n.js` (English/Pidgin strings), `api.js` (API client).

## Deployment

- **API:** `docker build -t scamshield .` then deploy to Google Cloud Run (the container honours `$PORT`). Set `ALLOWED_ORIGINS` to the frontend's origin.
- **Frontend:** Vercel (`frontend/vercel.json`, Vite build to `dist`). Set `VITE_API_URL` in the project settings.

## Tech stack

Python 3.12, FastAPI, scikit-learn, joblib; React 19, Vite, Tailwind 4; Docker, Google Cloud Run, Vercel.

## Limitations

- Trained on a small hand-reviewed set (105 messages) plus an English-language public spam set, so it will miss patterns it hasn't seen. Treat results as guidance, not proof.
- The held-out set is only 15 messages; no large-scale evaluation yet.
- Rate limiting is in-memory per instance.
- Never share your PIN, OTP or BVN with anyone. If a message claims to be your bank, call the number on the back of your card. Scams can be reported to the EFCC or your bank.

## Roadmap

More hand-reviewed local data, Yoruba, Hausa and Igbo support, a WhatsApp share target, and evaluation on a larger held-out set.

## Data credits

UCI SMS Spam Collection (see `data/UCI_README.txt`). Some held-out examples are sourced from the CheckAm project (github.com/adeyanjufuhad/CheckAm).
