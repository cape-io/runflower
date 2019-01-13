# Runflower

Take an array of an array strings and turn it into a _.flow() of functions.

It's a way to get around environments that do not allow `eval` or `new Function`. It also allows shipping code as json or yaml or whatever you prefer.

## Available function libraries

* lodash/fp
* understory
* prairie

## Usage

```javascript
import { evaluate } from 'runflower'

const createString = evaluate([
  ['over', [['constant', '/cape-io/'], ['get', 'url.subdomain'], ['get', 'pathname']]],
  ['join', ''],
])
// flow(over([_.constant('/cape-io/'), _.get('url.subdomain'), _.get('pathname')]))

const info = { url: { subdomain: 'dev' }, pathname: '/index.html' }

const result = createString(info) // => '/cape-io/dev/index.html'
```
