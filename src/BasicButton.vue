<template>
  <button>
    {{ title }}
  </button>
</template>

<script>
  import PlatButton from 'PlatButton.vue';

  export default {
    components : {
      'plat-button' : PlatButton,
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

</style>
