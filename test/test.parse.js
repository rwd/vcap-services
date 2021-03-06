'use strict';

var assert = require('assert');
var extend = require('extend');
var vcapServices = require('../index');

function assertEmptyObject(actual) {
  assert.equal(0, Object.keys(actual).length);
}

// override console.warn and supress messages
console.warn = function(){
  return ;
};

describe('vcap_services', function() {
  var ORIGINAL_VALUE = null;
  var credentials = {
    password: '<password>',
    url: '<url>',
    username: '<username>',
    api_key: '<api_key>'
  };
  var redis = {name: 'Compose for Redis-ov'};
  var nosql_x5 = {name: 'Cloudant NoSQL DB-x5'};
  var nosql_x6 = {name: 'Cloudant NoSQL DB-x6'};

  before(function() {
    // save VCAP_SERVICES value in an auxiliar variable.
    ORIGINAL_VALUE = process.env.VCAP_SERVICES;

    // set individual service environmental variables
    process.env.CONVERSATION_W1 = JSON.stringify(credentials);
    process.env.COMPOSE_FOR_REDIS_OV = JSON.stringify(redis);

    process.env.CLOUDANT_NOSQL_DB_X5 = JSON.stringify(nosql_x5);
    process.env.CLOUDANT_NOSQL_DB_X6 = JSON.stringify(nosql_x6);

    process.env.OBJECT_STORAGE_6J = 'Not JSON';

    process.env.weather_company_data_wu = JSON.stringify({ name: 'weather-company_data_wu' });

    // set VCAP_SERVICES to a default value
    process.env.VCAP_SERVICES = JSON.stringify({
      personality_insights: [{
        plan: 'not-a-plan'
      },{
        credentials: {},
        plan: 'beta'
      },{
        credentials: credentials,
        plan: 'standard'
      }],
      retrieve_and_rank: [{
        name: 'retrieve-and-rank-standard',
        label: 'retrieve_and_rank',
        plan: 'standard',
        credentials: credentials
      }],
      natural_language_classifier: [{
        name: 'NLC 1',
        plan: 'standard',
        credentials: credentials
      },{
        name: 'NLC 2',
        plan: 'standard',
        credentials: credentials
      }],
      object_storage: [{
        name: 'OS 1',
        plan: 'standard',
        credentials: credentials,
        tags: ['eu']
      },{
        name: 'OS 2',
        plan: 'standard',
        credentials: credentials,
        tags: ['us']
      }]
    });
  });

  after(function() {
    // return the original value to VCAP_SERVICES
    if (ORIGINAL_VALUE) {
      process.env.VCAP_SERVICES = ORIGINAL_VALUE;
    } else {
      process.env.VCAP_SERVICES = '';
    }
  });

  describe('get', function() {
    it('should return {} for missing parameters', function() {
      assertEmptyObject(vcapServices.getCredentials(null));
      assertEmptyObject(vcapServices.getCredentials({}));
      assertEmptyObject(vcapServices.getCredentials(undefined));
    });

    it('should return the last available credentials', function() {
      assert.deepEqual(credentials, vcapServices.getCredentials('personality_insights'));
      assert.deepEqual(credentials, vcapServices.getCredentials('personality'));
    });

    it('should return the last available credentials that match a plan', function() {
      assert.deepEqual(credentials, vcapServices.getCredentials('personality_insights','standard'));
      assertEmptyObject(vcapServices.getCredentials('personality','beta'));
      assertEmptyObject(vcapServices.getCredentials('personality','foo'));
    });

    it('should return the last available credentials that match an instance name', function() {
      assert.deepEqual(credentials, vcapServices.getCredentials('natural_language_classifier',null,'NLC 1'));
      assertEmptyObject(vcapServices.getCredentials('natural_language_classifier',null,'NLC 3'));
      assertEmptyObject(vcapServices.getCredentials('natural_language_classifier','foo','NLC 1'));
      assertEmptyObject(vcapServices.getCredentials('natural_language_classifier','foo','NLC 3'));
    });

    it('should return the last available credentials that match a plan and an instance name', function() {
      assert.deepEqual(credentials, vcapServices.getCredentials('natural_language_classifier','standard','NLC 1'));
      assertEmptyObject(vcapServices.getCredentials('natural_language_classifier','foo','NLC 1'));
      assertEmptyObject(vcapServices.getCredentials('natural_language_classifier','foo','NLC 3'));
    });

    it('should return the last available credentials that match a tag', function() {
      assert.deepEqual(credentials, vcapServices.getCredentials('object_storage',null,null,'eu'));
      assertEmptyObject(vcapServices.getCredentials('object_storage',null,null,'sa'));
      assertEmptyObject(vcapServices.getCredentials('object_storage','foo',null,'eu'));
      assertEmptyObject(vcapServices.getCredentials('object_storage','foo',null,'sa'));
      assertEmptyObject(vcapServices.getCredentials('natural_language_classifier',null,null,'eu'));
    });

    it('should return {} when service plan not found', function() {
      assertEmptyObject(vcapServices.getCredentials('personality','foo'));
    });

    it('should return {} when service not found', function() {
      assertEmptyObject(vcapServices.getCredentials('foo'));
    });

    it('should return {} when service has no credentials', function() {
      assertEmptyObject(vcapServices.getCredentials('personality_insights','not-a-plan'));
    });

    it('should return conversation service credentials', function() {
      assert.deepEqual(credentials, vcapServices.getCredentials(null, null, 'conversation_w1'));
    });

    it('should return first available nosql db service information', function() {
      assert.deepEqual(nosql_x5, vcapServices.getCredentials(null, null, 'cloudant_nosql_db_x5'));
    });

    it('should return instance of nosql db or fall back on service name if instance name DNE', function() {
      assertEmptyObject(vcapServices.getCredentials(null, null, 'cloudant_nosql_xx'));
      assert.deepEqual(nosql_x5, vcapServices.getCredentials('cloudant_nosql', null, 'cloudant_nosql_db_x5'));

      assert.deepEqual(nosql_x5, vcapServices.getCredentials(null, null, 'cloudant_nosql_db_x5'));
      assert.deepEqual(nosql_x5, vcapServices.getCredentials('cloudant_nosql', null, 'cloudant_nosql_db_x5'));

      assert.deepEqual(nosql_x6, vcapServices.getCredentials(null, null, 'cloudant_nosql_db_x6'));
      assert.deepEqual(nosql_x6, vcapServices.getCredentials('cloudant_nosql', null, 'cloudant_nosql_db_x6'));
    });

    it('should return {} if the env variable is not upper case', function() {
      assertEmptyObject(vcapServices.getCredentials(null, null, 'weather_company_data_wu'));
      assertEmptyObject(vcapServices.getCredentials(null, null, 'weather_company_data'));
    });

    it('should return redis information when name or iname are specified with other delimiters [ -&]', function() {
      assert.deepEqual(redis, vcapServices.getCredentials(null, null, 'COMPOSE_FOR_REDIS_OV'));
      assert.deepEqual(redis, vcapServices.getCredentials(null, null, 'Compose-for-Redis-ov'));
      assert.deepEqual(redis, vcapServices.getCredentials(null, null, 'Compose for redis ov'));
      assert.deepEqual(redis, vcapServices.getCredentials(null, null, 'Compose&for&redis-ov'));
    });

    it('should return {} when the env var is not JSON', function() {
      assertEmptyObject(vcapServices.getCredentials(null, null, 'OBJECT_STORAGE'));

      assertEmptyObject(vcapServices.getCredentials(null, null, 'Object Storage-6j'));
    });

    it('should get the credentials for Starter', function() {
      assert.deepEqual(credentials, vcapServices.getCredentialsForStarter('personality_insights'));
    });
  });

  describe('find', function() {
    it('should return {} for missing parameters', function() {
      assertEmptyObject(vcapServices.findCredentials(null));
      assertEmptyObject(vcapServices.findCredentials(undefined));
    });

    it('returns first match for empty filters', function() {
      assert.deepEqual(credentials, vcapServices.findCredentials({}));
    });

    it('filters by service name if provided', function() {
      assert.deepEqual(credentials, vcapServices.findCredentials({ service: 'personality_insights' }));
      assert.deepEqual(credentials, vcapServices.findCredentials({ service: /^personality/ }));
      assertEmptyObject(vcapServices.findCredentials({ service: 'foo' }));
    });

    it('filters by instance properties if provided', function() {
      assert.deepEqual(credentials, vcapServices.findCredentials({ service: 'personality_insights', instance: { plan: 'standard' } }));
      assertEmptyObject(vcapServices.findCredentials({ service: 'personality_insights', instance: { plan: 'beta' } }));
      assert.deepEqual(credentials, vcapServices.findCredentials({ service: 'natural_language_classifier', instance: { plan: 'standard', name: 'NLC 1' } }));
      assertEmptyObject(vcapServices.findCredentials({ service: 'natural_language_classifier', instance: { plan: 'foo', name: 'NLC 1' } }));
      assert.deepEqual(credentials, vcapServices.findCredentials({ service: 'object_storage', instance: { tags: 'eu', plan: 'standard' } }));
      assertEmptyObject(vcapServices.findCredentials({ service: 'object_storage', instance: { name: 'foo', tags: 'eu' } }));
    });

    it('should return {} when service has no credentials', function() {
      assertEmptyObject(vcapServices.findCredentials({ service: 'personality_insights', instance: { plan: 'not-a-plan' } }));
    });

    it('should return conversation service credentials', function() {
      assert.deepEqual(credentials, vcapServices.findCredentials({ instance: { name: 'conversation_w1' } }));
    });

    it('should return first available nosql db service information', function() {
      assert.deepEqual(nosql_x5, vcapServices.findCredentials({ instance: { name: 'cloudant_nosql_db_x5' } }));
    });

    it('should return instance of nosql db or fall back on service name if instance name DNE', function() {
      assertEmptyObject(vcapServices.findCredentials({ instance: { name: 'cloudant_nosql_xx' } }));

      assert.deepEqual(nosql_x5, vcapServices.findCredentials({ instance: { name: 'cloudant_nosql_db_x5' } }));
      assert.deepEqual(nosql_x5, vcapServices.findCredentials({ service: 'cloudant_nosql', instance: { name: 'cloudant_nosql_db_x5' } }));

      assert.deepEqual(nosql_x6, vcapServices.findCredentials({ instance: { name: 'cloudant_nosql_db_x6' } }));
      assert.deepEqual(nosql_x6, vcapServices.findCredentials({ service: 'cloudant_nosql', instance: { name: 'cloudant_nosql_db_x6' } }));
    });

    it('should return {} if the env variable is not upper case', function() {
      assertEmptyObject(vcapServices.findCredentials({ instance: { name: 'weather_company_data_wu' } }));
      assertEmptyObject(vcapServices.findCredentials({ instance: { name: 'weather_company_data' } }));
    });

    it('should return redis information when name or iname are specified with other delimiters [ -&]', function() {
      assert.deepEqual(redis, vcapServices.findCredentials({ instance: { name: 'COMPOSE_FOR_REDIS_OV' } }));
      assert.deepEqual(redis, vcapServices.findCredentials({ instance: { name: 'Compose-for-Redis-ov' } }));
      assert.deepEqual(redis, vcapServices.findCredentials({ instance: { name: 'Compose for redis ov' } }));
      assert.deepEqual(redis, vcapServices.findCredentials({ instance: { name: 'Compose&for&redis-ov' } }));
    });

    it('should return {} when the env var is not JSON', function() {
      assertEmptyObject(vcapServices.findCredentials({ instance: { 'name': 'OBJECT_STORAGE' } }));
      assertEmptyObject(vcapServices.findCredentials({ instance: { 'name': 'Object Storage-6j' } }));
    });
  });
});

describe('credentials file and Kube', function() {
  var cloudCredentials = {
    watson_conversation_password: '<password>',
    watson_conversation_url: '<url>',
    watson_conversation_username: '<username>',
    watson_conversation_api_key: '<api_key>',
    watson_conversation_apikey: '<apikey>',
  };
  var credentials = {
    'api_key': '<api_key>',
    'iam_apikey': '<apikey>',
    'password': '<password>',
    'url': '<url>',
    'username': '<username>',
  };

  it('should return {} for missing parameters', function() {
    assertEmptyObject(vcapServices.getCredentialsFromLocalConfig(null));
    assertEmptyObject(vcapServices.getCredentialsFromLocalConfig({}));
    assertEmptyObject(vcapServices.getCredentialsFromLocalConfig(undefined));
  });

  it('should return the credentials', function() {
    assert.deepEqual(credentials, vcapServices.getCredentialsFromLocalConfig('conversation', cloudCredentials));
  });


  it('should get the IAM credentials for Starter from Kube', function() {
    var kubeCredentials = {
      apikey: 'apikey',
      url: 'url'
    };
    var expectedCredentials = {
      iam_apikey: 'apikey',
      url: 'url'
    };
    process.env.service_watson_discovery = JSON.stringify(kubeCredentials);
    assert.deepEqual(expectedCredentials, vcapServices.getCredentialsForStarter('discovery'));
  });

  it('should get the CF credentials for Starter from Kube', function() {
    var kubeCredentials = {
      username: 'username',
      password: 'password'
    };
    process.env.service_watson_discovery = JSON.stringify(kubeCredentials);
    assert.deepEqual(kubeCredentials, vcapServices.getCredentialsForStarter('discovery'));
  });

  it('should get the credentials for Starter from file', function() {
    assert.deepEqual(credentials, vcapServices.getCredentialsForStarter('conversation', cloudCredentials));
  });

  it('should return {} for Starter from file for wrong params', function() {
    assertEmptyObject(vcapServices.getCredentialsForStarter(null));
    assertEmptyObject(vcapServices.getCredentialsForStarter({}));
    assertEmptyObject(vcapServices.getCredentialsForStarter(undefined));
  });
});

describe('cloud functions credentials bind', function() {

  var credentials = {
    'password': '<password>',
    'username': '<username>',
  };
  it('should succeed with __bx_creds as credential source', function(){
    var params = { text: 'hello', __bx_creds: {conversation: credentials}};
    var _params = vcapServices.getCredentialsFromServiceBind(params, 'conversation');
    assert.deepEqual(_params, extend({}, {text: 'hello'}, credentials));
  });

  it('should succeed with __bx_creds as credential source with an alternate name', function() {
    var params = { text: 'hello', __bx_creds: {conversation: credentials}};
    var _params = vcapServices.getCredentialsFromServiceBind(params, 'conversation');
    assert.deepEqual(_params, extend({}, {text: 'hello'}, credentials));
  });

  it('should succeed with __bx_creds as credential source with an alternate name', function() {
    var params = { text: 'hello', __bx_creds: {conversationAltName: credentials,}};
    var _params = vcapServices.getCredentialsFromServiceBind(params, 'conversation', 'conversationAltName');
    assert.deepEqual(_params, extend({}, {text: 'hello'}, credentials));
  });

  it('should not modify params with __bx_creds as credential source with a different name', function() {
    var params = { text: 'hello', __bx_creds: {assistant: credentials,}};
    var _params = vcapServices.getCredentialsFromServiceBind(params, 'conversation', 'conversationAltName');
    assert.deepEqual(_params, extend({}, {text: 'hello'}));
  });

  it('should modify apikey to iam_apikey', function() {
    var params = { text: 'hello', __bx_creds: {assistant: {apikey: '<api-key>'},}};
    var _params = vcapServices.getCredentialsFromServiceBind(params, 'assistant');
    assert.deepEqual(_params, {text: 'hello', iam_apikey: '<api-key>'});
  });

});
