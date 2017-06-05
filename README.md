# Vue single component HTML Renderer

```bash
npm install vue-single-component-html-renderer
```

# Examples

```javascript
import renderer from 'vue-single-component-html-renderer';

renderer('/path/to/vue.vue')
    .then( ( {html, style} ) => {
        console.log(html);
        console.log(style);
    });
```

# License
[MIT](LICENSE)