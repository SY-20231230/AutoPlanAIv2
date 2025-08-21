/* src/mockNetwork.js
 * 개발 중 네트워크 전부 차단 + 빈 응답 반환
 * import 순서가 아주 중요: 앱보다 '먼저' 로드해야 함
 */

(function () {
  // 활성/비활성 토글 (원하면 F12 콘솔에서 window.__MOCK_API__ = false 로 끌 수 있음)
  window.__MOCK_API__ = true;

  // ------- fetch 목킹 -------
  const originalFetch = window.fetch;
  window.fetch = function (input, init = {}) {
    if (!window.__MOCK_API__) return originalFetch(input, init);

    const url = typeof input === 'string' ? input : input.url;
    const method = (init.method || 'GET').toUpperCase();
    console.log(`🚫 [MOCK fetch] ${method} ${url}`);

    // 필요하면 URL별로 케이스 분기해서 더미데이터 내려도 됨
    const mockBody = {};
    const blob = new Blob([JSON.stringify(mockBody)], { type: 'application/json' });
    const response = new Response(blob, { status: 200, statusText: 'OK' });
    return Promise.resolve(response);
  };

  // ------- XMLHttpRequest(axios가 사용) 목킹 -------
  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (method, url, async, user, password) {
    this.__mock_meta__ = { method: (method || 'GET').toUpperCase(), url: url || '' };
    return originalOpen.apply(this, arguments);
  };

  XMLHttpRequest.prototype.send = function (body) {
    if (!window.__MOCK_API__) return originalSend.apply(this, arguments);

    const { method, url } = this.__mock_meta__ || {};
    console.log(`🚫 [MOCK XHR] ${method} ${url}`);

    // 가짜 응답 만들기
    const self = this;
    setTimeout(function () {
      // readyState 변화 시뮬레이션
      self.readyState = 4;
      self.status = 200;
      self.responseText = JSON.stringify({});
      self.response = self.responseText;

      // 이벤트 콜백 호출
      if (typeof self.onreadystatechange === 'function') self.onreadystatechange();
      if (typeof self.onload === 'function') self.onload();
    }, 50);
  };

  console.log('✅ MOCK network installed (fetch + XHR). Set window.__MOCK_API__ = false to disable.');
})();