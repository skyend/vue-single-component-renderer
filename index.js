import VueParser from 'vue-loader/lib/parser';
import {transform, transformFromAst} from 'babel-core';
import path from 'path';
import fs from 'fs';
import Vue from 'vue';
import Promise from 'bluebird';
import Program from 'ast-query';
import LRU from 'lru-cache';

import {
    createRenderer
} from 'vue-server-renderer';




export default function renderComponent(componentPath){
    return new Promise((resolve, reject)=>{
        VueComponentMaker(componentPath)
            .then((componentWrapObject) => {

                createRenderer().renderToString(new Vue(componentWrapObject.component), (err, html)=>{
                    if( err ){
                        reject(err);
                    } else {
                        resolve({
                            html : html,
                            style : componentWrapObject.accumlatedStyles,
                        });
                    }
                })
            }, (err)=>{
                reject(err);
            });
    });
}

function VueComponentMaker(_path, named, dependencyGraph = []) {
    return new Promise((resolve, reject) => {

        if( dependencyGraph.indexOf(_path) > -1 ){

            if( named ){
                resolve({
                    component : {
                        template : '<span>Warn : '+named+' Circular dependency Component </span>'
                    },
                    componentKey : named,
                });
            } else {
                resolve({
                    component : {
                        template : '<span>Warn :Circular dependency Component </span>'
                    },
                });
            }

            return;
        }


        fs.readFile(_path, 'utf8', (err, vueComponentContent) => {
            if (err) {
                reject(err);
                return;
                // throw err;
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
            let stylesContent = '';
            for(let i =0; i < parts.styles.length; i++ ){
                stylesContent += parts.styles[i].content.trim();
            }
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
                presets: ['es2015', 'es2016', 'es2017']
            });
            // console.log(JSON.stringify(scriptContent));
            // console.log(transformed.code);

            let program = Program(transformed.code);
            // console.log('component objectExpression',
            //     program.assignment("exports.default").value().key('components'));


            let componentUseExpression = program.assignment("exports.default").value().key('components');
            let componentUseObjectExpression = null;
            if( componentUseExpression.type === 'CallExpression' ){
                componentUseObjectExpression = componentUseExpression.arguments[0];
            } else if( componentUseExpression.type === 'ObjectExpression' ) {
                if(
                    componentUseExpression.node &&
                    componentUseExpression.node.type === 'ObjectExpression'
                ){
                    componentUseObjectExpression = componentUseExpression.node;
                }
            }
            // console.log(JSON.stringify(componentUseObjectExpression));
            let keyValueSet = keyValueArrayFromObjectExpression(componentUseObjectExpression);
            keyValueSet = keyValueSet.map(([key, valueNode]) => [key,expectedExpressionString(valueNode)])
            // console.log( keyValueSet );

            let componentImportUsingMapArray = keyValueSet.map(([key, componentReferenceLexical])=>{
                let vueComponentFilepath = null;
                let refTokens = componentReferenceLexical.split('.');

                let componentStoredVarNode = program.var(refTokens[0]).nodes[0];

                if( refTokens[1] === 'default' ){
                    if(
                        componentStoredVarNode.init &&
                        componentStoredVarNode.init.type === 'CallExpression'
                    ){

                        if(
                            componentStoredVarNode.init.callee.type === 'Identifier' &&
                            componentStoredVarNode.init.callee.name === '_interopRequireDefault'
                        ) {
                            componentStoredVarNode = program.var(
                                componentStoredVarNode.init.arguments[0].name
                            ).nodes[0];

                            if(
                                componentStoredVarNode.init &&
                                componentStoredVarNode.init.type === 'CallExpression'
                            ){
                                if (
                                    componentStoredVarNode.init.callee.type === 'Identifier' &&
                                    componentStoredVarNode.init.callee.name === 'require'
                                ){
                                    vueComponentFilepath = componentStoredVarNode.init.arguments[0].value;
                                }
                            }
                        } else if (
                            componentStoredVarNode.init.callee.type === 'Identifier' &&
                            componentStoredVarNode.init.callee.name === 'require'
                        ){
                            /// Damn
                        }
                    }
                }

                return {
                    componentKey : key,
                    componentReferenceLexical : componentReferenceLexical,
                    vueComponentFilepath,
                }
            });

            // console.log('import ',
            //     program.assignment());

            // console.time('parse');
            // let dependentVueComponents = parseDependencyComponents(transformed);
            // console.timeEnd('parse');
            // console.timeEnd('parse');
            //
            // console.log(dependentVueComponents);
            // console.log(transformed.metadata)

            if (componentImportUsingMapArray.length > 0) {
                let moduleImportPromises = componentImportUsingMapArray
                    .map(function (importUsingMap) {

                        return new Promise((resolve, reject)=>{
                            if( importUsingMap.vueComponentFilepath === null ){
                                resolve({
                                    component : {
                                        template : '<span>No Preview Area</span>',
                                    },
                                    accumlatedStyles : '',
                                    componentKey : importUsingMap.componentKey,
                                })
                            } else {
                                let importComponentPath = path.resolve(path.dirname(_path), importUsingMap.vueComponentFilepath);
                                VueComponentMaker(importComponentPath, importUsingMap.componentKey, [...dependencyGraph, _path])
                                    .then(({component, accumlatedStyles, componentKey})=>{
                                    // console.log('child success')
                                    resolve({
                                        component ,
                                        accumlatedStyles,
                                        componentKey ,
                                    });
                                })
                            }
                        });
                    });

                // console.log('why?',moduleImportPromises);
                Promise.all(moduleImportPromises)
                    .spread(function(componentWraps){


                        let componentDict = {};
                        let styles = stylesContent || '';
                        for(let i = 0 ; i < arguments.length; i++ ){
                            let componentWrap = arguments[i];
                            componentDict[componentWrap.componentKey] = componentWrap.component;
                            if( componentWrap.accumlatedStyles )
                                styles += '\n' + componentWrap.accumlatedStyles;
                        }

                        let Comp = {
                            components: componentDict,
                            template: templateContent,
                        };


                        resolve({
                            component: Comp,
                            accumlatedStyles: styles,
                            componentKey : named,
                        });
                    });
            } else {
                let Comp;
                if( named ){
                    Comp = {
                        template: templateContent,
                    };
                } else {
                    Comp = {
                        template: templateContent,
                    };
                }



                resolve({
                    component: Comp,
                    accumlatedStyles: stylesContent || '',
                    componentKey : named,
                });
            }
        });
    });
}


function parseDependencyComponents(vueComponentScriptPartContent) {
    // console.log(vueComponentScriptPartContent.code);
    // console.log(vueComponentScriptPartContent.ast);
    let ast = vueComponentScriptPartContent.ast;
    let programBody = ast.program.body;
    let expressionStatements = programBody.filter((term) => {
        return term.type === 'ExpressionStatement';
    });

    let nextExpressions = expressionStatements.map((stateExp) => {
        let exp = stateExp.expression;
        if (exp.type === 'AssignmentExpression') {
            let leftExp = exp.left;
            let rightExp = exp.right;

            if (
                leftExp.type === 'MemberExpression' &&
                rightExp.type === 'ObjectExpression'
            ) {
                let leftObject = leftExp.object;
                let leftProperty = leftExp.property;

                if (
                    leftObject.type === 'Identifier' &&
                    leftObject.name === 'exports' &&
                    leftProperty.type === 'Identifier' &&
                    leftProperty.name === 'default'
                ) {

                    // return ObjectExpression
                    // exports.default = <{ ... }>;
                    return rightExp;
                }
            }
        }
        return null;
    });

    // console.log('ObjectExpression',console.dir(nextExpressions[1].prototype));
    nextExpressions = nextExpressions.filter((exp) => !!exp);

    // ObjectExpression
    nextExpressions = nextExpressions.map((exp) => {
        let properties = exp.properties;

        // console.log(JSON.stringify(properties));
        let propertyExpressionAsComponent = null;
        for (let i = 0; i < properties.length; i++) {
            let prop = properties[i];
            let propKeyNode = prop.key;

            if (propKeyNode.type === 'Identifier' && propKeyNode.name === 'components') {
                propertyExpressionAsComponent = prop;
                break;
            }
        }

        if (propertyExpressionAsComponent) {
            let propertyValueExp = propertyExpressionAsComponent.value;

            if (propertyValueExp.type === 'ObjectExpression') {
                // console.log('Component ObjectExpression');

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

    nextExpressions = nextExpressions.filter((exp) => !!exp);

    if (nextExpressions.length === 0) {
        return [];
    }

    let i_thinkFinalExpression_is_that = nextExpressions[0];

    let properties = i_thinkFinalExpression_is_that.properties;

    return properties.map((propertyExp) => {
        let propertyValueExpression = propertyExp.value;
        if (propertyValueExpression.type === 'MemberExpression') {
            let objectFieldExpression = propertyValueExpression.object;
            let propertyFieldExpression = propertyValueExpression.property;

            if (
                objectFieldExpression.type === 'Identifier' &&
                propertyFieldExpression.type === 'Identifier'
            ) {
                return objectFieldExpression.name + '.' + propertyFieldExpression.name;
            }
        } else if (propertyValueExpression.type === 'Identifier') {
            return propertyValueExpression.name;
        }

        return null;
    }).filter((componentDefined) => !!componentDefined);
}


function keyValueArrayFromObjectExpression(objectExpression){
    // console.log(objectExpression);
    if( objectExpression.type === 'ObjectExpression'){
        let properties = objectExpression.properties;

        return properties.map(function (prop) {
            return [prop.key.value, prop.value];
        });
    }

    throw new Error("argument[0] must be ObjectExpression");
}


function expectedExpressionString(expressionNode){
    if(
        expressionNode.type === 'MemberExpression' &&
        expressionNode.object.type === 'Identifier' &&
        expressionNode.property.type === 'Identifier'
    ){
        return expressionNode.object.name + '.' + expressionNode.property.name;
    }

    throw new Error(`expectedExpressionString error : unexpected expressionNode.
    \n${expressionNode.type} 
    \n${JSON.stringify(expressionNode)}\n`)
}

function getArgumentsFromCallExpression(callExpressionNode){
    return callExpressionNode.arguments;
}