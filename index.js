import VueParser from 'vue-loader/lib/parser';
import {transform} from 'babel-core';
import path from 'path';
import Vue from 'vue';
import Promise from 'bluebird';
import LRU from 'lru-cache';



import {
    createRenderer
} from 'vue-server-renderer';

import fs from 'fs';

let vueComponentFile = path.join(process.cwd(), '/src/', 'BasicButton.vue');
// fs.readFile(vueComponentFile, 'utf8', (err, data)=>{
//     console.log(data);
//
//     let parsedVue = VueParser(data, vueComponentFile);
//     let templateContent = parsedVue.template.content;
//     console.log(parsedVue);
//
//     let transformed = transform(parsedVue.script.content, {
//         presets : ['es2015','es2016','es2017']
//     });
//
//
//     console.log(JSON.stringify(transformed));
//
//     // let renderer = createRenderer({
//     //     template : templateContent
//     // })
//
//     console.log(createRenderer().renderToString(BB, (err, str)=>{
//         console.log(err, str)
//     }));
//
//
//
// });

VueComponentMaker(vueComponentFile)
    .then((component)=>{
        // console.log(component);
    });


function VueComponentMaker(_path){
    return new Promise(( resolve, reject )=>{
        fs.readFile(_path, 'utf8', (err, vueComponentContent)=>{
            if( err ){
                throw err;
            }

            /**
             * Parts
             *  .template
             *   .type
             *   .content
             *  .script
             *   .type
             *   .content
             *  .styles
             *   .type
             *   .content
             */
            let parts = VueParser(vueComponentContent, _path);

            let templateContent = parts.template.content;
            let scriptContent = parts.script.content;
            let stylesContent = parts.styles.content;

            let transformedScripts = transform(scriptContent, {
                presets : ['es2015','es2016','es2017']
            });

            console.time('parse');
            let dependentVueComponents = parseDependencyComponents(transformedScripts);
            console.timeEnd('parse');

            console.log(dependentVueComponents);
            /**
             * Transformed
             *  .ast
             *  .code
             *      .javascript
             *  .metadata
             *      .modules
             *          .exports
             *          .imports
             *              []
             *              .imported
             *                  []
             *              .source
             *              .specifiers
             */
            let transformed = transform(scriptContent, {
                presets : ['es2015','es2016','es2017']
            });
            // console.log(transformed.metadata)

            if( transformed.metadata.modules.imports.length > 0 ){
                let imports = transformed.metadata.modules.imports;
                let moduleImportPromises = imports.map(function({imported, source, specifiers}){
                    console.log(imported, source, specifiers);
                });
            }

            let LComp = Vue.component('comp',{
                template:'<div> heelo LCOmp </div>',
            });

            let RComp = Vue.component('comp',{
                template:'<div> heelo RCOmp </div>',
            });

            let Comp = Vue.component('',{
                components : {
                    comp : RComp,
                },
                template:'<div><comp></comp></div>'
            })

            // createRenderer().renderToString(new Comp({}), (err, html)=>{
            //     console.log(err, html);
            // })

            resolve({
                component : Comp,
                accumlatedStyles : stylesContent,
            })
        });
    });
}


function parseDependencyComponents(vueComponentScriptPartContent){
    // console.log(vueComponentScriptPartContent.code);
    // console.log(vueComponentScriptPartContent.ast);
    let ast = vueComponentScriptPartContent.ast;
    let programBody = ast.program.body;
    let expressionStatements = programBody.filter((term)=>{
        return term.type === 'ExpressionStatement';
    });

    let nextExpressions = expressionStatements.map((stateExp)=>{
        let exp = stateExp.expression;
        if( exp.type === 'AssignmentExpression' ){
            let leftExp = exp.left;
            let rightExp = exp.right;

            if(
                leftExp.type === 'MemberExpression' &&
                rightExp.type === 'ObjectExpression'
            ){
                let leftObject = leftExp.object;
                let leftProperty = leftExp.property;

                if(
                    leftObject.type === 'Identifier' &&
                    leftObject.name === 'exports' &&
                    leftProperty.type === 'Identifier' &&
                    leftProperty.name === 'default'
                ){

                    // return ObjectExpression
                    // exports.default = <{ ... }>;
                    return rightExp;
                }
            }
        }
        return null;
    });


    nextExpressions = nextExpressions.filter((exp) => !!exp);

    // ObjectExpression
    nextExpressions = nextExpressions.map((exp) => {
        let properties = exp.properties;
        let propertyExpressionAsComponent = null;
        for(let i = 0; i < properties.length; i++ ){
            let prop = properties[i];
            let propKeyNode = prop.key;

            if( propKeyNode.type === 'Identifier' && propKeyNode.name === 'components' ){
                propertyExpressionAsComponent = prop;
                break;
            }
        }

        if( propertyExpressionAsComponent ){
            let propertyValueExp = propertyExpressionAsComponent.value;

            if( propertyValueExp.type === 'ObjectExpression' ){


                // ObjectExpression
                // exports.default = {
                //     components: <{
                //         'plat-button': _PlatButton2.default
                //     }>, ...
                // }
                return propertyValueExp;
            }
        }


        return null;
    });

    nextExpressions = nextExpressions.filter((exp)=>!!exp);

    if( nextExpressions.length === 0 ){
        return [];
    }

    let i_thinkFinalExpression_is_that = nextExpressions[0];

    let properties = i_thinkFinalExpression_is_that.properties;

    return properties.map((propertyExp)=>{
        let propertyValueExpression = propertyExp.value;
        if( propertyValueExpression.type === 'MemberExpression' ){
            let objectFieldExpression = propertyValueExpression.object;
            let propertyFieldExpression = propertyValueExpression.property;

            if(
                objectFieldExpression.type === 'Identifier' &&
                propertyFieldExpression.type === 'Identifier'
            ){
                return objectFieldExpression.name + '.' + propertyFieldExpression.name;
            }
        } else if( propertyValueExpression.type === 'Identifier' ){
            return propertyValueExpression.name;
        }

        return null;
    }).filter((componentDefined)=> !!componentDefined);
}