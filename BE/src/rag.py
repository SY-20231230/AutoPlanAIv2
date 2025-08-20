from typing import List, Dict, Any

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


class CorpusIndex:
	def __init__(self, chunks: List[str]):
		self.chunks = chunks
		self.vectorizer = TfidfVectorizer(min_df=1, max_features=30000)
		self.matrix = self.vectorizer.fit_transform(chunks)


def build_corpus_index(chunks: List[str]) -> CorpusIndex:
	return CorpusIndex(chunks)


def _approx_token_len(text: str) -> int:
	# 매우 러프한 토큰 길이 근사(한글/영문 공통): 공백 분할 기준
	return max(1, len(text.split()))


def find_supporting_chunks(index: CorpusIndex, query: str, k: int = 8, max_tokens: int = 1200) -> List[str]:
	qv = index.vectorizer.transform([query])
	scores = cosine_similarity(qv, index.matrix).ravel()
	ranked = sorted(enumerate(scores), key=lambda x: x[1], reverse=True)

	picked: List[str] = []
	total_tokens = 0
	for idx, _ in ranked[: max(k * 3, k)]:
		ch = index.chunks[idx]
		l = _approx_token_len(ch)
		if total_tokens + l > max_tokens:
			continue
		picked.append(ch)
		total_tokens += l
		if len(picked) >= k:
			break
	return picked
