"""ScamShield model: TF-IDF (word + char) + rule features -> logistic regression.

Train:  python -m ml.model        (run from repo root; writes ml/model.joblib)
Use:    from ml.model import ScamShield; m = ScamShield.load(); m.predict("text")
"""
import os
import numpy as np
import pandas as pd
import joblib
from scipy.sparse import hstack, csr_matrix
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression

try:
    from .rules import features, triggered
except ImportError:
    from rules import features, triggered

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "..", "data")
MODEL_PATH = os.path.join(HERE, "model.joblib")

PUBLIC_PER_CLASS = 300   # downsample public data so Nigerian samples carry weight
HAND_WEIGHT = 15.0       # each hand-reviewed sample counts 15x
RULE_SCALE = 3.0


class ScamShield:
    def __init__(self):
        self.word = TfidfVectorizer(ngram_range=(1, 2), sublinear_tf=True, min_df=1)
        self.char = TfidfVectorizer(analyzer="char_wb", ngram_range=(2, 4), sublinear_tf=True, min_df=2)
        self.clf = LogisticRegression(max_iter=3000, class_weight="balanced", C=5)
        self.rule_keys = list(features("x").keys())

    def _rules(self, texts):
        return csr_matrix(np.array([[features(t)[k] for k in self.rule_keys] for t in texts], dtype=float)) * RULE_SCALE

    def _X(self, texts, fit=False):
        low = [t.lower() for t in texts]
        if fit:
            parts = [self.word.fit_transform(low), self.char.fit_transform(low)]
        else:
            parts = [self.word.transform(low), self.char.transform(low)]
        return hstack(parts + [self._rules(texts)]).tocsr()

    def fit(self, texts, labels, weights):
        self.clf.fit(self._X(texts, fit=True), labels, sample_weight=weights)
        return self

    def predict(self, text):
        probs = self.clf.predict_proba(self._X([text]))[0]
        classes = list(self.clf.classes_)
        order = np.argsort(probs)[::-1]
        label = classes[order[0]]
        scam_prob = float(1 - probs[classes.index("safe")])
        return {
            "label": label,
            "is_scam": label != "safe",
            "confidence": round(float(probs[order[0]]), 3),
            "scam_probability": round(scam_prob, 3),
            "top3": [{"label": classes[i], "prob": round(float(probs[i]), 3)} for i in order[:3]],
            "signals": triggered(text),
        }

    def save(self, path=MODEL_PATH):
        # save plain components (not the class) so loading works from any entry point
        joblib.dump({"word": self.word, "char": self.char, "clf": self.clf, "rule_keys": self.rule_keys}, path, compress=3)

    @classmethod
    def load(cls, path=MODEL_PATH):
        m, state = cls(), joblib.load(path)
        m.word, m.char, m.clf, m.rule_keys = state["word"], state["char"], state["clf"], state["rule_keys"]
        return m


def load_training_data():
    pub = pd.read_csv(os.path.join(DATA, "combined_v2.csv"))
    pub = pub[pub.source != "hand_reviewed"]
    pub = pd.concat([g.sample(min(len(g), PUBLIC_PER_CLASS), random_state=0) for _, g in pub.groupby("label")])
    hand = pd.read_csv(os.path.join(DATA, "handmade_all.csv"))
    d = pd.concat([pub.assign(w=1.0), hand.assign(w=HAND_WEIGHT)], ignore_index=True)
    return d


if __name__ == "__main__":
    d = load_training_data()
    m = ScamShield().fit(list(d.text), d.label, d.w)
    m.save()
    print(f"trained on {len(d)} rows -> {MODEL_PATH} ({os.path.getsize(MODEL_PATH)/1e6:.1f} MB)")
