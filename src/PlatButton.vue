<template>
  <button class="plat-button">
    {{ title || 'PlatButton' }}

    <circular-basic-button></circular-basic-button>
  </button>
</template>

<script>
  import BasicButton from './BasicButton.vue';

  export default {
      components : {
        'circular-basic-button' : BasicButton,
      },
    props: {
        title : {
            type : String,
            default:'Plat Button',
        }
    }
  }
</script>

<style>
  .plat-button {
    background-color: #000;
    color:#fff;
    border:0;
    padding:10px;
  }
</style>
