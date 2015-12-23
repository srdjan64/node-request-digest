'use strict';
Object.defineProperty(exports, '__esModule', {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _request = require('request');

var _request2 = _interopRequireDefault(_request);

var _crypto = require('crypto');

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var HTTPDigest = (function () {
  function HTTPDigest(username, password) {
    _classCallCheck(this, HTTPDigest);

    this.nc = 0;
    this.username = username;
    this.password = password;
  }

  _createClass(HTTPDigest, [{
    key: 'request',
    value: function request(options, callback) {
      var _this = this;

      options.url = options.host + options.path;
      return (0, _request2['default'])(options, function (error, res) {
        _this._handleResponse(options, res, callback);
      });
    }
  }, {
    key: '_handleResponse',
    value: function _handleResponse(options, res, callback) {
      var challenge = this._parseDigestResponse(res.caseless.dict['www-authenticate']);
      var ha1 = (0, _crypto.createHash)('md5');
      ha1.update([this.username, challenge.realm, this.password].join(':'));
      var ha2 = (0, _crypto.createHash)('md5');
      ha2.update([options.method, options.path].join(':'));

      var _generateCNONCE2 = this._generateCNONCE(challenge.qop);

      var nc = _generateCNONCE2.nc;
      var cnonce = _generateCNONCE2.cnonce;

      // Generate response hash
      var response = (0, _crypto.createHash)('md5');
      var responseParams = [ha1.digest('hex'), challenge.nonce];

      if (cnonce) {
        responseParams.push(nc);
        responseParams.push(cnonce);
      }

      responseParams.push(challenge.qop);
      responseParams.push(ha2.digest('hex'));
      response.update(responseParams.join(':'));

      // Setup response parameters
      var authParams = {
        username: this.username,
        realm: challenge.realm,
        nonce: challenge.nonce,
        uri: options.path,
        qop: challenge.qop,
        opaque: challenge.opaque,
        response: response.digest('hex'),
        algorithm: 'MD5'
      };

      authParams = this._omitNull(authParams);

      if (cnonce) {
        authParams.nc = nc;
        authParams.cnonce = cnonce;
      }

      var headers = options.headers || {};
      headers.Authorization = this._compileParams(authParams);
      options.headers = headers;

      return (0, _request2['default'])(options, function (error, response, body) {
        callback(error, response, body);
      });
    }
  }, {
    key: '_omitNull',
    value: function _omitNull(data) {
      // _.omit(data, (elt) => {
      //   console.log('elt ' + elt + ' et condition : ' + elt === null);
      //   return elt == null;
      // });
      var newObject = {};
      _lodash2['default'].forEach(data, function (elt, key) {
        if (elt != null) {
          newObject[key] = elt;
        }
      });

      return newObject;
    }
  }, {
    key: '_parseDigestResponse',
    value: function _parseDigestResponse(digestHeader) {
      var prefix = 'Digest ';
      var challenge = digestHeader.substr(digestHeader.indexOf(prefix) + prefix.length);
      var parts = challenge.split(',');
      var length = parts.length;
      var params = {};

      for (var i = 0; i < length; i++) {
        var paramSplitted = this._splitParams(parts[i]);

        if (paramSplitted.length > 2) {
          params[paramSplitted[1]] = paramSplitted[2].replace(/\"/g, '');
        }
      }

      return params;
    }
  }, {
    key: '_splitParams',
    value: function _splitParams(paramString) {
      return paramString.match(/^\s*?([a-zA-Z0-0]+)=("(.*)"|MD5|MD5-sess|token)\s*?$/);
    }
  }, {
    key: '_generateCNONCE',

    //
    // ## Parse challenge digest
    //
    value: function _generateCNONCE(qop) {
      var cnonce = false;
      var nc = false;

      if (typeof qop === 'string') {
        var cnonceHash = (0, _crypto.createHash)('md5');

        cnonceHash.update(Math.random().toString(36));
        cnonce = cnonceHash.digest('hex').substr(0, 8);
        nc = this._updateNC();
      }

      return { cnonce: cnonce, nc: nc };
    }
  }, {
    key: '_compileParams',

    //
    // ## Compose authorization header
    //

    value: function _compileParams(params) {
      var parts = [];
      for (var i in params) {
        var param = i + '=' + (this._putDoubleQuotes(i) ? '"' : '') + params[i] + (this._putDoubleQuotes(i) ? '"' : '');
        parts.push(param);
      }

      return 'Digest ' + parts.join(',');
    }
  }, {
    key: '_putDoubleQuotes',

    //
    // ## Define if we have to put double quotes or not
    //

    value: function _putDoubleQuotes(i) {
      var excludeList = ['qop', 'nc'];

      return _lodash2['default'].includes(excludeList, i) ? true : false;
    }
  }, {
    key: '_updateNC',

    //
    // ## Update and zero pad nc
    //

    value: function _updateNC() {
      var max = 99999999;
      var padding = new Array(8).join('0') + '';
      this.nc = this.nc > max ? 1 : this.nc + 1;
      var nc = this.nc + '';

      return padding.substr(0, 8 - nc.length) + nc;
    }
  }]);

  return HTTPDigest;
})();

exports['default'] = function (username, password) {
  return new HTTPDigest(username, password);
};

module.exports = exports['default'];
