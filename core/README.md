# Gardener Core

Gardener is a static site generator built for LLM's.

# Installation

```
pnpm add @technium/gardener

# if you're using mermaid templating
npm install -g @mermaid-js/mermaid-cli
```

# Usage

Create a new file called `gardener.ts`

```ts
// gardener.ts
import path from "path";
import { Gardener } from "@technium/gardener";

const main = async () => {
    const gardener = new Gardener({
        src: {
            assetsDir: path.join(__dirname, "assets"),
            contentDir: path.join(__dirname, "content")
        },
        dist: path.join(__dirname, "dist"),
    })
    
    gardener.publish();
}

main().then(() => {
    console.log("Gardener has finished processing.");
}).catch(err => {
    console.error("Error during Gardener processing:", err);
});
```

Put your assets inside `/assets`. These will just get copy/pasted over.

Put your markdown and HTML files inside `/content`. These will get processed.