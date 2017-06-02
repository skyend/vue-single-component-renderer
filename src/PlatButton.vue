<template>
  <button>
    {{ title }}
  </button>
</template>

<script>
  export default {
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
