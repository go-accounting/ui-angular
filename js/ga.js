angular.module('ga.service', ['ngRoute','ngResource']) 
.factory('GaServer', function ($resource, $cacheFactory){
  return $resource('/api/coa', {}, {
    chartsOfAccounts: {method:'GET', params:{}, isArray:true},
    accounts: {method:'GET', params:{}, isArray:true, cache: $cacheFactory('accounts'), url:'/api/coa/:coa/accounts'},
    account: {method:'GET', params:{}, url:'/api/coa/:coa/accounts/:account'},
    transaction: {method:'GET', params:{}, url:'/api/fde/:coa/transactions/:transaction'},
    balanceSheet: {method:'GET', params:{}, isArray:true, url:'/api/financial-statements/:coa/balance-sheet?at=:at'},
    incomeStatement: {method:'GET', params:{}, url:'/api/financial-statements/:coa/income-statement?from=:from&to=:to'},
    ledger: {method:'GET', params:{}, url:'/api/financial-statements/:coa/accounts/:account/ledger?from=:from&to=:to'},
    journal: {method:'GET', params:{}, isArray:true, url:'/api/financial-statements/:coa/journal?from=:from&to=:to'},
    addAccount: {method:'POST', params:{}, url:'/api/coa/:coa/accounts'},
    addTransaction: {method:'POST', params:{}, isArray: true, url:'/api/fde/:coa/transactions'},
    updateAccount: {method:'PUT', params:{},  url:'/api/coa/:coa/accounts/:account'},
    updateTransaction: {method:'PUT', params:{}, isArray: true, url:'/api/fde/:coa/transactions/:transaction'},
    removeTransaction: {method:'DELETE', params:{}, url:'/api/fde/:coa/transactions/:transaction'},
    removeAccount: {method:'DELETE', params:{}, url:'/api/coa/:coa/accounts/:account'},
  });
})
.factory('httpInterceptor', function ($q, $rootScope, $log) {

  var numLoadings = 0;

  return {
    request: function (config) {
      $rootScope.$broadcast("http_request", config);
      numLoadings++;
      $rootScope.$broadcast("loader_show");
      return config || $q.when(config)
    },
    response: function (response) {
      if ((--numLoadings) === 0) {
        $rootScope.$broadcast("loader_hide");
      }
      return response || $q.when(response);
    },
    responseError: function (response) {
      $rootScope.$broadcast("http_error", response);
      if (!(--numLoadings)) {
        $rootScope.$broadcast("loader_hide");
      }
      return $q.reject(response);
    }
  };
})
.config(function ($httpProvider) {
  $httpProvider.interceptors.push('httpInterceptor');
})
.directive("loader", function ($rootScope, $http, $window) {
  return function ($scope, element, attrs) {
    $scope.$on("loader_show", function () {
        return element.show();
    });
    return $scope.$on("loader_hide", function () {
      return element.hide();
    });
  };
});

angular.module('ga', ['ngRoute','ngResource', 'ga.service'])
.config(function ($routeProvider, $locationProvider) {
  $routeProvider
    .when('/charts-of-accounts/:coa/accounts', {
      controller:'AccountsCtrl',
      templateUrl:'partials/accounts.html'
    })
    .when('/charts-of-accounts/:coa/account', {
      controller:'AccountsCtrl',
      templateUrl:'partials/account.html'
    })
    .when('/charts-of-accounts/:coa/accounts/:account', {
      controller:'AccountsCtrl',
      templateUrl:'partials/account.html'
    })
    .when('/charts-of-accounts/:coa/balance-sheet', {
      controller:'BsCtrl',
      templateUrl:'partials/balance-sheet.html'
    })
    .when('/charts-of-accounts/:coa/income-statement', {
      controller:'IsCtrl',
      templateUrl:'partials/income-statement.html'
    })
    .when('/charts-of-accounts/:coa/accounts/:account/ledger', {
      controller:'LedgerCtrl',
      templateUrl:'partials/ledger.html'
    })
    .when('/charts-of-accounts/:coa/journal', {
      controller:'JournalCtrl',
      templateUrl:'partials/journal.html'
    })
    .when('/charts-of-accounts/:coa/transaction', {
      controller:'TransactionCtrl',
      templateUrl:'partials/transaction.html'
    })
    .when('/charts-of-accounts/:coa/transactions/:transaction', {
      controller:'TransactionCtrl',
      templateUrl:'partials/transaction.html'
    })
    .when('/password', {
      controller:'PasswordCtrl',
      templateUrl:'partials/password.html'
    })
    .when('/users', {
      controller:'UserCtrl',
      templateUrl:'partials/users.html'
    })
    .when('/users/:user', {
      controller:'UserCtrl',
      templateUrl:'partials/user.html'
    })
    .when('/user', {
      controller:'UserCtrl',
      templateUrl:'partials/user.html'
    })
    .when('/login', {
      controller:'LoginCtrl',
      templateUrl:'partials/login.html'
    })
    .otherwise({
      redirectTo:'/'
    });
})
.directive('gaFocus', function ($parse) {
  return {
    scope: { trigger: '=gaFocus' },
    link: function(scope, element, attr) {
      scope.$watch('trigger', function(value) {
        if(value === true) { 
          element[0].focus();
          if ($parse(attr.gaFocus).assign) {
            scope.trigger = false;
          }
        }
      });
    }
  };
})
.directive("accountTypeahead", function ($routeParams, $rootScope, $compile, GaServer) {
  return {
    restrict: 'A',
    require: '?ngModel',
    link: function(scope, element, attrs, ngModel) {

      var source = function (query, cb) {
        var accounts = GaServer.accounts({coa: $routeParams.coa}, function () {
          var map = {}, result = [], i;
          var containsQuery = function (account, query) {
            if (!account) { return false; }
            if (account.number.indexOf(query) > -1 || account.name.toLowerCase().indexOf(query.toLowerCase()) > -1) {
              return true;
            }
            return containsQuery(map[account.parent], query);
          };
          for (i = 0; i < accounts.length; i += 1) {
            map[accounts[i]._id] = accounts[i];
          }
          for (i = 0; i < accounts.length; i += 1) {
            if (containsQuery(accounts[i], query)) {
              result.push(accounts[i]);
            }
          }
          cb(result);
        });
      }

      var templateFn = function (datum) {
        return '<p><strong>' + datum.number + '</strong></p><p>' + datum.name + '</p>';
      };
       
      element.typeahead(null, {
        displayKey: 'number',
        source: source,
        templates: {
          suggestion: templateFn
        }
      })
      .on('typeahead:selected', function($e, datum) { 
        ngModel.$setViewValue(datum._id);
      })
      .on('typeahead:onAutocompleted', function($e, datum) { 
        ngModel.$setViewValue(datum._id);
      });

      scope.$watch(attrs.ngModel, function(newValue, oldValue) {
        if (newValue === null && oldValue !== null) {
          element.typeahead('val', null);
        }
      });

    }
  };
})
.directive('gaEnter', function () {
  return function (scope, element, attrs) {
    element.bind("keydown keypress", function (event) {
        if(event.which === 13) {
          scope.$apply(function (){
              scope.$eval(attrs.gaEnter);
          });
          event.preventDefault();
        }
    });
  };
});

var NavigatorCtrl = function ($scope, $rootScope, $location, $http, $window, $cacheFactory, GaServer) {
  var isLastSegment = function (segment) {
    var arr = $location.path().split('/');
    if (arr[arr.length - 1].split('?')[0] === segment) {
      return true;
    } else if (arr.length > 1 && arr[arr.length - 2] === segment) {
      return true;
    } else {
      return false;
    }
  }
  $scope.isLoggedIn = function() {
    return !!$window.sessionStorage.getItem('token')
  };
  $scope.actionLabel = function() {
    if ($scope.routeIs('transaction$')) {
      return ': lançamento';
    } else if ($scope.routeIs('transactions\/[^\/]+$')) {
      return ': edição de lançamento';
    } else if ($scope.routeIs('account$')) {
      return ': nova conta';
    } else if ($scope.routeIs('accounts\/[^\/]+$')) {
      return ': edição de conta';
    } else if ($scope.routeIs('password$')) {
      return ': alteração de senha';
    } else if ($scope.routeIs('users\/[^\/]+$')) {
      return ': edição de usuário';
    } else {
      return '';
    }
  };
  $scope.routeIs = function(pattern) {
    return new RegExp(pattern).test($location.path());
  };
  $scope.$watch(function() { return $location.path(); }, function(newValue, oldValue) {
    if (!$scope.isLoggedIn()) {
      arr = $window.location.href.split('#')
      if (arr.length > 1 && arr[1].length > 1) {
        arr = arr[1].substring(1).split('&')
        token = arr.find(e => e.startsWith('id_token'))
        if (!!token) {
          token = token.split('=')[1]
          $window.sessionStorage.setItem('token', token)
          $http.defaults.headers.common['Authorization'] = 'Bearer ' + token;
          return
        }
      }
      provider = 'https://accounts.google.com'
      clientid = '946769606583-mthfmq6d01gp3ruq5rebvdo4fjp00s3b.apps.googleusercontent.com'
      $window.location.href = provider + '/o/oauth2/auth?client_id=' + clientid +
        '&redirect_uri=' + $window.location.origin + '&response_type=id_token&scope=openid%20email';
    } else if (!$rootScope.coaLoaded) {
      $http.defaults.headers.common['Authorization'] = 'Bearer ' + $window.sessionStorage.getItem('token');
      $rootScope.coaLoaded = true
      $scope.chartsOfAccounts = GaServer.chartsOfAccounts({}, function () {
        if ($location.path() === '/') {
          $scope.currentChartOfAccounts = $scope.chartsOfAccounts[0];
        } else {
          var i = 0
            , arr = $location.path().split('/');
          for (; i < $scope.chartsOfAccounts.length; i += 1) {
            if ($scope.chartsOfAccounts[i]._id === arr[2]) {
              $scope.currentChartOfAccounts = $scope.chartsOfAccounts[i];
            }
          };
        }
      });
    }
  });
  $scope.$watch('currentChartOfAccounts', function (newValue) {
    if (typeof newValue === 'undefined') { return; }
    var arr = $location.path().split('/');
    if (arr.length > 2 && arr[2] === newValue._id) { return; }
    if (arr.length === 2) {
      arr = [ '', 'charts-of-accounts', newValue._id, 'balance-sheet' ];
    }
    arr[2] = newValue._id;
    $location.path(arr.join('/'));
    $cacheFactory.get('accounts').removeAll();
  });
  $scope.$on("http_request", function (event, config) {
    $scope.errorMessage = undefined;
  });
  $scope.$on("http_error", function (event, response) {
    $rootScope.$broadcast("error_message", (response.data || '').replace('Error: ', ''));
  });
  $scope.$on("error_message", function (event, message) {
    $scope.errorMessage = message;
  });
};

var AccountsCtrl = function ($scope, $routeParams, $cacheFactory, $window, GaServer) {
  var account
  $scope.account = {};
  $scope.accounts = GaServer.accounts({coa: $routeParams.coa});
  $scope.save = function () {
    $scope.account.tags = []
    $scope.account.tags.push($scope.financialStatement);
    $scope.account.tags.push($scope.balanceNature);
    // $scope.account[$scope.detailDegree] = true;
    if (!!$scope.incomeStatementAttribute) { 
      $scope.account.tags.push($scope.incomeStatementAttribute.value);
    }
    if ($routeParams.account) {
      GaServer.updateAccount({coa: $routeParams.coa, account: $routeParams.account}, $scope.account, function () {
        $cacheFactory.get('accounts').removeAll();
        $window.history.back();
      });
    } else {
      GaServer.addAccount({coa: $routeParams.coa}, $scope.account, function () {
        $cacheFactory.get('accounts').removeAll();
        $scope.account = {};
      });
    }
  };
  $scope.remove = function () {
    GaServer.removeAccount({coa: $routeParams.coa, account: $routeParams.account}, function () {
      $cacheFactory.get('accounts').removeAll();
      $window.history.back();
    });
  }

  $scope.currentChartOfAccounts = function () {
    return $routeParams.coa;
  }
  $scope.accountId = function () {
    return $routeParams.account;
  };
  $scope.incomeStatementAttributes = [
    {},
    {name: 'Operacional', value: 'operating'},
    {name: 'Deduções', value: 'deduction'},
    {name: 'Tributos sobre faturamento', value: 'salesTax'},
    {name: 'Custo', value: 'cost'},
    {name: 'Tributos não operacionais', value: 'nonOperatingTax'},
    {name: 'Imposto de Renda', value: 'incomeTax'},
    {name: 'Dividendos', value: 'dividends'}];

  if ($routeParams.account) {
    account = GaServer.account({coa: $routeParams.coa, account: $routeParams.account}, function () {
      var accounts, i, j;
      $scope.account = { _id: account._id, name: account.name, number: account.number };
      for (i = 0; i < account.tags.length; i += 1) {
        if (/increaseOn/.test(account.tags[i])) {
          $scope.balanceNature = account.tags[i];
        } if (/balanceSheet$|incomeStatement$/.test(account.tags[i])) {
          $scope.financialStatement = account.tags[i];
        // } if (/analytic$|synthetic$/.test(account.tags[i])) {
        //   $scope.detailDegree = account.tags[i];
        } else {
          for (j = 0; j < $scope.incomeStatementAttributes.length; j += 1) {
            if (account.tags[i] === $scope.incomeStatementAttributes[j].value) {
              $scope.incomeStatementAttribute = $scope.incomeStatementAttributes[j];
              break;
            }
          }
        }
      }
      accounts = GaServer.accounts({coa: $routeParams.coa}, function () {
        var i;
        for (i = 0; i < accounts.length; i += 1) {
          if (accounts[i]._id === account.parent) {
            $scope.account.parent = accounts[i].number;
          }
        }
      });
    });
  }
};

var BsCtrl = function ($scope, $routeParams, $rootScope, $location, GaServer) {
  if (!!$location.search().at) {
    $scope.at = $location.search().at
  } else {
    if (!!$rootScope.lastBalanceSheetAt) {
      $scope.at = $rootScope.lastBalanceSheetAt;
    } else {
      $scope.at = convertToUTC(new Date());
      $scope.at = $scope.at.substring(0, $scope.at.indexOf('T'));
    }
  }
  $scope.dirtyAt = $scope.at;
  $rootScope.lastBalanceSheetAt = $scope.at;
  $scope.balanceSheet = GaServer.balanceSheet({coa: $routeParams.coa, at: $scope.at});
  $scope.isDebitBalance = function (e) {
    return e && e.account && 
      (e.account.increaseOnDebit && e.account.name.indexOf('(-)') === -1) ||
      (!e.account.increaseOnCredit && e.account.name.indexOf('(-)') !== -1);
  };
  $scope.isCreditBalance = function (e) {
    return !$scope.isDebitBalance(e);
  };
  $scope.currentChartOfAccounts = function () {
    return $routeParams.coa;
  };
  $scope.$watch('at', function (newValue, oldValue) {
    if (newValue !== oldValue) {
      $location.search({at: $scope.at});
    }
  });
  $scope.from = function () {
    return $scope.at.substring(0, 8) + '01';
  };
  $scope.to = function () {
    return $scope.at;
  };
};

var IsCtrl = function ($scope, $rootScope, $routeParams, $location, $filter, GaServer) {
  var label = {
    'grossRevenue': 'Gross revenue',
    'deduction': 'Gross revenue',
    'salesTax': 'Sales tax',
    'netRevenue': 'Net revenue',
    'cost': 'Cost',
    'grossProfit': 'Gross profit',
    'operatingExpense': 'Operating expense',
    'netOperatingIncome': 'Net operating income',
    'nonOperatingRevenue': 'Non operating revenue',
    'nonOperatingExpense': 'Non operating expense',
    'nonOperatingTax': 'Non operating tax',
    'incomeBeforeIncomeTax': 'Income before income tax',
    'incomeTax': 'Income tax',
    'dividends': 'Dividends',
    'netIncome': 'Net income'
  };
  fillRange($scope, $rootScope, $location, 'IncomeStatement');
  $scope.properties = [];
  $scope.dirtyFrom = $scope.from;
  $scope.dirtyTo = $scope.to;
  $scope.incomeStatement = GaServer.incomeStatement(
    {coa: $routeParams.coa, from: $scope.from, to: $scope.to}, 
    function () {
      var result = [];
      for(var p in $scope.incomeStatement) { 
         if ($scope.incomeStatement.hasOwnProperty(p)) {
            if (label[p] && $scope.incomeStatement[p]) {
              result.push({label: label[p], prop: $scope.incomeStatement[p]});
            }
         }
      }
      $scope.properties = result;
    }
  );
  $scope.currentChartOfAccounts = function () {
    return $routeParams.coa;
  }
  $scope.range = function () {
    return range($scope.from, $scope.to, $filter);
  };
  $scope.$watch('from+to', function (newValue, oldValue) {
    if (newValue != oldValue)
    $location.search({from: $scope.from, to: $scope.to});
  });
};

var LedgerCtrl = function ($scope, $rootScope, $routeParams, $location, $filter, GaServer) {
  fillRange($scope, $rootScope, $location, 'Ledger');
  $scope.ledger = GaServer.ledger({coa: $routeParams.coa, account: $routeParams.account, from: $scope.from, to: $scope.to});
  $scope.convertToUTC = convertToUTC;
  $scope.currentChartOfAccounts = function () {
    return $routeParams.coa;
  }
  $scope.range = function () {
    return range($scope.from, $scope.to, $filter);
  };
  $scope.debitsSum = function () {
    var result = 0, i = 0;
    if (!!$scope.ledger.entries) {
      for (; i < $scope.ledger.entries.length; i += 1) {
        if (!!$scope.ledger.entries[i].debit) {
          result += $scope.ledger.entries[i].debit;
        }
      }
    }
    return result;
  };
  $scope.creditsSum = function () {
    var result = 0, i = 0;
    if (!!$scope.ledger.entries) {
      for (; i < $scope.ledger.entries.length; i += 1) {
        if (!!$scope.ledger.entries[i].credit) {
          result += $scope.ledger.entries[i].credit;
        }
      }
    }
    return result;
  };
};

var JournalCtrl = function ($scope, $rootScope, $routeParams, $location, $filter, GaServer) {
  fillRange($scope, $rootScope, $location, 'Journal', true);
  $scope.dirtyFrom = $scope.from;
  $scope.dirtyTo = $scope.to;
  $scope.journal = GaServer.journal({coa: $routeParams.coa, from: $scope.from, to: $scope.to});
  $scope.convertToUTC = convertToUTC;
  $scope.currentChartOfAccounts = function () {
    return $routeParams.coa;
  }
  $scope.range = function () {
    return range($scope.from, $scope.to, $filter);
  };
  $scope.$watch('from+to', function (newValue, oldValue) {
    if (newValue != oldValue)
    $location.search({from: $scope.from, to: $scope.to});
  });
};

var TransactionCtrl = function ($scope, $rootScope, $routeParams, $window, GaServer) {
  var t
  var save = function (callback) {
    if ($scope.transaction.debits.length < 1 || $scope.transaction.credits.length < 1) {
      $rootScope.$broadcast("error_message", "Devem ser informados pelo menos um débito e pelo menos um crédito");
      return;
    }
    if (!$scope.date) {
      $rootScope.$broadcast("error_message", "A data deve ser informada");
      return;
    }
    if (!$scope.transaction.memo) {
      $rootScope.$broadcast("error_message", "O memorando deve ser informado");
      return;
    }
    $scope.transaction.date = $scope.date + 'T00:00:00Z';
    if ($routeParams.transaction) {
      GaServer.updateTransaction({coa: $routeParams.coa, transaction: $routeParams.transaction}, $scope.transaction, function () {
        if (callback) callback();
      });
    } else {
      GaServer.addTransaction({coa: $routeParams.coa}, [$scope.transaction], function () {
        if (callback) callback();
      });
    }
  };
  var clear = function () {
    $scope.account = null;
    $scope.transaction = {debits:[], credits:[]};
    $scope.entries = [];
    $scope.date = convertToUTC(new Date());
    $scope.date = $scope.date.substring(0, $scope.date.indexOf('T'))
  };
  clear();
  $scope.accountFocus = true;
  if ($routeParams.transaction) {
    t = GaServer.transaction({coa: $routeParams.coa, transaction: $routeParams.transaction}, function () {
      var accounts;
      $scope.transaction = t;
      $scope.date = t.date.substring(0, 10);
      accounts = GaServer.accounts({coa: $routeParams.coa}, function () {
        var map = {}, a, i;
        for (i = 0; i < accounts.length; i += 1) {
          map[accounts[i]._id] = accounts[i];
        }
        function add (account, value, balanceNature) {
          var entry = {e: {account: account.number, value: value}, account: account};
          entry[balanceNature] = value;
          $scope.entries.push(entry);
        }
        for (i = 0; i < t.debits.length; i += 1) {
          a = map[t.debits[i].account];
          add(a, t.debits[i].value, 'debit');
        }
        for (i = 0; i < t.credits.length; i += 1) {
          a = map[t.credits[i].account];
          add(map[t.credits[i].account], t.credits[i].value, 'credit');
        }
      });
    });
  }
  $scope.save = function () {
    save(function () { $window.history.back(); });
  };
  $scope.addAndContinue = function () {
    save(function () { 
      clear(); 
      $scope.accountFocus = true; 
    });
  };
  $scope.addEntry = function () {
    var entry;
    var evalIfExpression = function (value) {
      if (typeof value === 'number') {
        return value;
      }
      return $scope.$eval(value.replace('.', '').replace(/,/g, '.'));
    }
    if (!$scope.account) {
      $rootScope.$broadcast("error_message", "A conta deve ser informada");
      return;
    }
    if (!$scope.debit && !$scope.credit) {
      if ($scope.debitsSum() === $scope.creditsSum()) {
        $rootScope.$broadcast("error_message", "Ou o débito ou o crédito deve ser informado");
        return;
      } else if ($scope.debitsSum() > $scope.creditsSum()) {
        $scope.credit = $scope.debitsSum() - $scope.creditsSum();
      } else {
        $scope.debit = $scope.creditsSum() - $scope.debitsSum();
      }
    }
    var isDebit
    if ($scope.debit) {
      $scope.debit = evalIfExpression($scope.debit);
      entry = {e: {account: $scope.account, value: $scope.debit}, debit: $scope.debit};
      $scope.transaction.debits.push(Object.assign({}, entry.e))
      isDebit = true
    } else {
      $scope.credit = evalIfExpression($scope.credit);
      entry = {e: {account: $scope.account, value: $scope.credit}, credit: $scope.credit};
      if ($scope.credit) {
        $scope.transaction.credits.push(Object.assign({}, entry.e))
      }
    }
    var accounts = GaServer.accounts({coa: $routeParams.coa}, function () {
      for (var i = 0; i < accounts.length; i++) {
        if (accounts[i]._id === entry.e.account) {
          entry.account = accounts[i]
        } else if (accounts[i].number === entry.e.account) {
          entry.account = accounts[i];
          let transactionEntries
          if (isDebit) {
            transactionEntries = $scope.transaction.debits
          } else {
            transactionEntries = $scope.transaction.credits
          }
          let e = transactionEntries.pop()
          e.account = accounts[i]._id
          transactionEntries.push(e)
        }
    }});
    $scope.entries.push(entry);
    $scope.account = $scope.debit = $scope.credit = undefined;
  };
  $scope.removeEntry = function (index) {
    function removeOnTransaction (col) {
      for (let i = 0; i < col.length; i += 1) {
        if (col[i].account === $scope.entries[index].account._id &&
            col[i].value === $scope.entries[index].e.value) {
          col.splice(i, 1);
          return
        }
      }
    }
    removeOnTransaction($scope.transaction.debits);
    removeOnTransaction($scope.transaction.credits);
    $scope.entries.splice(index, 1);
  }
  $scope.remove = function () {
    GaServer.removeTransaction({coa: $routeParams.coa, transaction: $routeParams.transaction}, function () {
      $window.history.back();
    });
  }
  $scope.debitsSum = function () {
    var result = 0, i = 0;
    for (; i < $scope.transaction.debits.length; i += 1) {
      result += $scope.transaction.debits[i].value;
    }
    return result;
  };
  $scope.creditsSum = function () {
    var result = 0, i = 0;
    for (; i < $scope.transaction.credits.length; i += 1) {
      result += $scope.transaction.credits[i].value;
    }
    return result;
  };
  $scope.transactionId = function () {
    return $routeParams.transaction;
  };
}

function convertToUTC (dt) {
  if (typeof dt === 'string')
    return dt.substring(0, 10) + "T00:00:00.000";
  return moment(dt).format('YYYY-MM-DD') + "T00:00:00.000";
}

function fillRange(scope, rootScope, location, statement, fromEqualsToByDefault) {
  if (!!location.search().from && !!location.search().to) {
    scope.from = location.search().from
    scope.to = location.search().to
  } else {
    if (!!rootScope['last' + statement + 'From']) {
      scope.from = rootScope['last' + statement + 'From'];
      scope.to = rootScope['last' + statement + 'To'];
    } else {
      scope.to = convertToUTC(new Date());
      scope.to = scope.to.substring(0, scope.to.indexOf('T'));
      scope.from = !!fromEqualsToByDefault ? scope.to : scope.to.substring(0, 8) + '01';
    }
  }
  rootScope['last' + statement + 'From'] = scope.from;
  rootScope['last' + statement + 'To'] = scope.to;
}

function range (from, to, filter) {
    var result = '';
    if (!!from && !!to) {
      if (from.substring(0, 4) !== to.substring(0, 4)) {
        result = filter('date')(from, 'shortDate') + ' a ' + filter('date')(to, 'shortDate');
      } else if (from.substring(5, 7) !== to.substring(5, 7)) {
        result = filter('date')(from, 'dd/MM') + ' a ' + filter('date')(to, 'shortDate');
      } else {
        result = filter('date')(from, 'dd') + ' a ' + filter('date')(to, 'shortDate');
      }
    }
    return result;
  }
