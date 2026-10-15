## Inspiration
I built ScamShield because I was scammed myself.

When it happened, I had nowhere to turn. I had a message in front of me and a decision to make, and there was no simple tool that could tell me, "this looks like a scam." I couldn't check it. I had to guess, and I guessed wrong. Afterwards I realised how many people in Nigeria are in that same position every day: a fake bank alert asking for a BVN or PIN, a "you've won" prize, an investment offer, a job that needs a "registration fee". The tools that exist are mostly built for Western phishing, and none of them speak to us in a way we actually understand.

So I built the thing I needed that day: a place where you paste the message, in seconds, before you act, and get a clear answer and, just as important, the reason why. I wanted it in English and Nigerian Pidgin, because a warning only helps if the person can understand it. This is not a theory project for me. It comes from a loss I couldn't prevent, and I built it so the next person has the check I didn't have.

## What it does
ScamShield lets you paste an SMS or email and returns a scam verdict with a risk level and plain-language reasons (for example: "It asks for your BVN, OTP, PIN, card details or account number. No real bank or company will ever ask for these."). The interface works in **English and Nigerian Pidgin**.

## How I built it
- **Model:** TF-IDF features (word and character n-grams) plus hand-written rule features, fed to a logistic regression (scikit-learn). Rules cover signals such as asking for secrets, payment requests, suspicious or look-alike links and urgency, and each rule doubles as the explanation shown to the user.
- **Data:** a public SMS spam dataset (UCI), down-sampled so it doesn't drown out the signal, combined with a small set of hand-reviewed Nigerian scam messages that are weighted 15x. I kept a held-out set to check the model.
- **API:** FastAPI with per-IP rate limiting and locked-down CORS, containerised and deployed on **Google Cloud Run**. It works without any LLM key (rule-based explanations); an optional OpenAI-compatible LLM can rewrite explanations.
- **Frontend:** React + Vite + Tailwind on **Vercel**, with English/Pidgin switching.

## Challenges
Public datasets barely contain Nigerian scam patterns, so I had to hand-label local examples and weight them carefully without overfitting to a tiny set. Making the explanations trustworthy was the other challenge: tying each explanation to a concrete triggered rule keeps it honest instead of a vague "this looks suspicious".

## What I learned
Small, well-chosen local data plus transparent rules can beat a bigger generic model for a local problem, and explaining a verdict matters as much as the verdict itself.

## What's next
More hand-reviewed local data, more Nigerian languages (Yoruba, Hausa, Igbo), a WhatsApp share-target so you can check a message without leaving the chat, and a proper evaluation on a larger held-out set.
