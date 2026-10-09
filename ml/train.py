import pandas as pd, numpy as np, sys, warnings; warnings.filterwarnings('ignore')
from scipy.sparse import hstack, csr_matrix
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import StratifiedKFold
from sklearn.metrics import accuracy_score, f1_score
from rules import features
D='../data/'
pub=pd.read_csv(D+'combined_v2.csv'); pub=pub[pub.source!='hand_reviewed']
h=pd.read_csv(D+'handmade_all.csv').reset_index(drop=True)
RK=list(features("x").keys())
def rmat(texts): return csr_matrix(np.array([[features(t)[k] for k in RK] for t in texts],dtype=float))
def build(pub_n, hand_w, use_rules, rule_scale=3.0):
    def fit(tr_hand):
        p=pd.concat([g.sample(min(len(g),pub_n),random_state=0) for _,g in pub.groupby('label')]) if pub_n else pub
        d=pd.concat([p.assign(w=1.0),tr_hand.assign(w=hand_w)],ignore_index=True); t=d.text.str.lower()
        v=TfidfVectorizer(ngram_range=(1,2),sublinear_tf=True,min_df=1); c=TfidfVectorizer(analyzer='char_wb',ngram_range=(2,4),sublinear_tf=True,min_df=2)
        parts=[v.fit_transform(t),c.fit_transform(t)]
        if use_rules: parts.append(rmat(d.text)*rule_scale)
        m=LogisticRegression(max_iter=3000,class_weight='balanced',C=5).fit(hstack(parts).tocsr(),d.label,sample_weight=d.w)
        def pred(texts):
            tl=[x.lower() for x in texts]; P=[v.transform(tl),c.transform(tl)]
            if use_rules: P.append(rmat(texts)*rule_scale)
            return m.predict(hstack(P).tocsr())
        return pred
    return fit
def cv(fit, seeds=(1,2,3)):
    acc=[];f1=[];sv=[];last=None
    for s in seeds:
        P=np.empty(len(h),dtype=object)
        for tr,te in StratifiedKFold(5,shuffle=True,random_state=s).split(h.text,h.label):
            P[te]=fit(h.iloc[tr])(list(h.text.iloc[te]))
        y=h.label.values; acc.append(accuracy_score(y,P)); f1.append(f1_score(y,P,average='macro')); sv.append(accuracy_score(y!='safe',P!='safe')); last=P
    return np.mean(acc),np.mean(f1),np.mean(sv),last
if __name__=='__main__':
    print('config                                   type-acc  macroF1  scam-vs-safe')
    for name,args in [('before (all public, w=15, no rules)',(0,15,False)),
                      ('1 downsample public to 300/class',(300,15,False)),
                      ('1+2+3 downsample + rule features',(300,15,True))]:
        a,f,s,P=cv(build(*args)); print('%-40s %.2f      %.2f     %.2f'%(name,a,f,s))
    print('\nconfusion (1+2+3, last seed):'); print(pd.crosstab(pd.Series(h.label.values,name='true'),pd.Series(P,name='pred')).to_string())
