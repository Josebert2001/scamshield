"""Rule-based signals for Nigerian scam messages. Each returns 0/1; used as model features and as explanation hooks."""
import re
from urllib.parse import urlparse

TRUSTED = {"opay-inc.com","opayapp.onelink.me","apps.apple.com","play.google.com","gtbank.com","accessbankplc.com",
           "zenithbank.com","firstbanknigeria.com","uba.com","mtn.ng","jumia.com.ng"}
URL = re.compile(r'(?:https?://|www\.)?[\w-]{1,63}(?:\.[\w-]{1,63}){0,5}\.(?:com|ng|online|co|net|org|ly|me|info|xyz)(?:/\S{0,200})?', re.I)
MONEY = r'(?:n|ngn|₦)\s?\d[\d,\.]{0,12}\s?(?:k|m)?|\d[\d,\.]{0,12}\s?(?:k|m)\b'
PAY = r'\b(pay|send|transfer|deposit|invest|register with|put)\b'

def _urls(t): return [m.group(0) for m in URL.finditer(t)]
def _domain(u):
    u = u if u.startswith("http") else "http://" + u
    return (urlparse(u).netloc or "").lower().removeprefix("www.")

RULES = {
 "asks_secret":      lambda t: re.search(r'\b(bvn|otp|pin|cvv|password|card (number|details)|6-digit code|code we just sent|account number)\b', t) and re.search(r'\b(send|share|give|reply|enter|confirm|verify|update)\b', t) and not re.search(r'(never|do not|don\'t) (ask|share)', t),
 "fee_first":        lambda t: re.search(PAY + r'[^.!?]{0,40}(' + MONEY + r')[^.!?]{0,60}\b(fee|tax|insurance|duty|clearance|registration|processing|verification|stamp|delivery|admin|activate|activation|slot|form|validation|shipping|unlock|acceptance|interview|aptitude)', t) or re.search(r'\b(fee|tax|insurance|clearance)\b[^.!?]{0,40}\b(first|before|to (receive|claim|release|unlock))', t),
 "guaranteed_return":lambda t: re.search(r'(guarantee|double your|100% (legit|payback|safe)|zero risk|no risk|daily|weekly profit|\d+%\s*(daily|weekly|profit|returns?)|collect n?\d+k? after|receive n?[\d\.,]+[km]? in \d+)', t),
 "prize_claim":      lambda t: re.search(r'\b(you (have )?won|you win|lucky winner|don win|picked in|selected for a prize|lottery|giveaway|promo)\b', t) and re.search(r'\b(claim|send|pay|contact|reply)\b', t),
 "job_offer":        lambda t: re.search(r'\b(hiring|recruit(ment|ing)?|vacancy|shortlisted|job|internship|work from home|work visa|salary|monthly|employment)\b', t),
 "loan_offer":       lambda t: re.search(r'\b(loan|repayment|borrow|credit check|guarantor)\b', t),
 "grant_offer":      lambda t: re.search(r'\b(grant|empowerment|palliative|disbursement|cash ?out|free money|apply (now|here)|apply to receive)\b', t) and re.search(r'(n\s?\d[\d,]*|click|apply|link|receive)', t),
 "earn_online":      lambda t: (re.search(r'\b(earn|make|get)\b[^.!?]{0,25}(' + MONEY + r')[^.!?]{0,25}\b(daily|weekly|per day|a day|from home|online)\b', t) and not re.search(r'\bi (earn|make)\b', t)) or re.search(r'\b(starter pack|activation fee|small money big profit)\b', t),
 "airtime_request":  lambda t: re.search(r'\b(buy|send|load|recharge)\b[^.!?]{0,20}\b(airtime|recharge card|data)\b[^.!?]{0,20}\b(first|me|so we)\b|\b(airtime|recharge card)\b[^.!?]{0,25}\b(first|to continue)\b', t),
 "urgency":          lambda t: re.search(r'\b(urgent|immediately|today|24 ?(hrs?|hours)|12 hours|within \d+|before (friday|monday)|expires?|deactivat|suspend|blocked|frozen|on hold|last chance|limited)', t),
 "account_threat":   lambda t: re.search(r'(account|wallet|sim|card|bvn|meter)[^.!?]{0,40}(block|suspend|restrict|deactivat|froz|hold|flag|disconnect|expire)', t),
 "secrecy_or_family":lambda t: re.search(r'(do not tell|don\'t call|new number|lost my phone|i\'m in trouble|stuck at|inheritance|next of kin|beneficiary|\$\d[\d\.,]*\s?m)', t),
 "pidgin":           lambda t: re.search(r'\b(abeg|oga|don|dey|wetin|na|wey|sharp sharp|make we|una|pipo|o!)\b', t),
}

def link_flags(t):
    us = _urls(t); bad = 0; shortener = 0
    for u in us:
        d = _domain(u)
        if any(d == x or d.endswith("." + x) for x in TRUSTED): continue
        if d.split(".")[0] in ("bit","tinyurl","t") or d.startswith("bit.ly"): shortener = 1
        bad = 1
    return bad, shortener

LEGIT_FORMAT = lambda t: re.search(r'\b(debit|credit)\b[^\n]{0,30}\bamt\b|\bbal(ance)?:', t) and not re.search(r'(click|http|send|share)', t)

def features(text):
    t = text.lower()[:1500]
    f = {k: int(bool(fn(t))) for k, fn in RULES.items()}
    f["untrusted_link"], f["shortener"] = link_flags(t)
    f["legit_alert_format"] = int(bool(LEGIT_FORMAT(t)))
    return f

def triggered(text):
    return [k for k, v in features(text).items() if v and k not in ("pidgin",)]
