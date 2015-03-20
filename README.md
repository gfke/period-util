# gulp-directive

An example project for creating a directive module using the yoso-gulp package

### Install
```bash
$ npm install --save git@github.com:gfke/yoso-starter-module.git
$ npm install --save yoso-starter-module
```

### Usage
```javascript
    angular.module('yoso-starter-directive.common.directives', [])
  .directive('exampleDirective', require('yoso-starter-module'));
 ```
