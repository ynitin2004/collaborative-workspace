// dns-fix.cjs — Preload script to fix Neon DB DNS resolution
// Your local DNS refuses to resolve neon.tech domains.
// This patches Node's dns.lookup to use Google DNS (8.8.8.8) for neon.tech.

const dns = require('dns');
const { Resolver } = require('dns');

const resolver = new Resolver();
resolver.setServers(['8.8.8.8', '8.8.4.4']);

const _lookup = dns.lookup;

dns.lookup = function(hostname, options, callback) {
  // Normalize arguments
  if (typeof options === 'function') {
    callback = options;
    options = {};
  } else if (typeof options === 'number') {
    options = { family: options };
  }
  options = options || {};

  // Only intercept neon.tech domains
  if (!hostname || !hostname.includes('neon.tech')) {
    return _lookup.call(dns, hostname, options, callback);
  }

  resolver.resolve4(hostname, (err, addresses) => {
    if (err || !addresses || !addresses.length) {
      return _lookup.call(dns, hostname, options, callback);
    }
    
    // If caller wants all results (all: true), return array format
    if (options.all) {
      const results = addresses.map(addr => ({ address: addr, family: 4 }));
      return callback(null, results);
    }
    
    // Single result: (err, address, family)
    return callback(null, addresses[0], 4);
  });
};
