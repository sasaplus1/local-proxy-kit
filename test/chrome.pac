function FindProxyForURL(url, host) {
  if (shExpMatch(host, 'httpbin.org')) {
    return 'PROXY 127.0.0.1:8087; PROXY 127.0.0.1:8088; DIRECT';
  }

  return 'DIRECT';
}

// vim:ft=javascript
