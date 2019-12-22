# ts-transformer-testing-libray

> Make testing custom TypeScript transformers a breeze

* :zap: Avoid tsc work 
* :electric_plug: Work with multiple modules
* :surfer: Mock source modules as required

Custom TypeScript transformers are a powerful way to 
work with your source code, but coming up with a good
unit testing setup for them is hard.

This library does the heavy lifting for you.


## Installation

```
yarn add -D ts-transformer-testing-library
```

## Usage

```ts
// Transform a standalone TypeScript source
import { transform } from "ts-transformer-testing-library";

const result = transform(`console.log('Hello, World!');`, {
  transform() { /* Imaginary transform World ➞ You */ }
});

console.log(result); // "Hello, You!";
```

```ts
// Transform a standalone TypeScript source
import { transformFile } from "ts-transformer-testing-library";

const result = transformFile({ 
  path: '/index.ts', 
  contents: `import {phrase} from './phrase'; console.log(phrase);`
}, {
  sources: [{ path: '/phrase.ts', contents: `export const phrase = 'Hello, World!'` }],
  transform() { /* Imaginary transform World ➞ You */ }
});

console.log(result); // "Hello, You!";
```

## API

:warning: API is still in flux. Consult interfaces in source for details.

## License

MIT. Copyright 2019 - present Mario Nebl

