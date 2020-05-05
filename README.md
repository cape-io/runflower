# Runflower

Write basic data handling code as arrays of strings.

It's a way to get around environments that do not allow `eval` or `new Function`. User should be familiar with `_.flow` and functional programming ideas.

## Available function libraries

* lodash/fp
* understory
* prairie

## Usage

```javascript
import _ from 'lodash/fp'
import { evaluate } from 'runflower'

const createString1 =  _.flow(
  _.over([_.constant('/cape-io/'), _.get('url.subdomain'), _.get('pathname')]),
  _.join(''),
)

const createString2 = evaluate([
  ['over', [['constant', '/cape-io/'], ['get', 'url.subdomain'], ['get', 'pathname']]],
  ['join', ''],
])

const info = { url: { subdomain: 'dev' }, pathname: '/index.html' }

console.log(createString1(info) === createString2(info)) // => true
```

With YAML you can write things like:

```yaml
---
flow:
 - get: data
 - map:
    flow:
      - get: price
      - add: 10
```
