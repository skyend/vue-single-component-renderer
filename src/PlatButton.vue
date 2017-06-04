<template>
  <button>
    {{ title || 'PlatButton' }}

    <basic-btn></basic-btn>
  </button>
</template>

<script>
  import BasicButton from './BasicButton.vue';

  export default {
      components : {
        'basic-btn' : BasicButton,
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
  button {
    background-color: #000;
    color:#fff;
    border:0;
    padding:10px;
  }
</style>
