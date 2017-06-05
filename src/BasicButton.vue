<template>
  <div>
      <button class="basic-button">{{ title || 'basicButton' }}</button>
      <plat-button></plat-button>
  </div>
</template>

<script>
  import PlatButtonSingle from './PlatButton.vue';

  export default {
    components : {
      'plat-button' : PlatButtonSingle,
    },
    props: {
      title : {
        type : String,
        default:'Button',
      }
    }
  }
</script>

<style>
    .basic-button {
        border:0px;
    }
</style>
