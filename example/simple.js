import Renderer from '../index.js';

let vueComponentFile = path.join(process.cwd(), '/src/', 'BasicButton.vue');
Renderer(vueComponentFile).then(({html, style})=>{
    console.log(html,style);
});