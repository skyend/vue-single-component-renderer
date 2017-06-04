<template>
  <div>
      <button>{{ title || 'basicButton' }}</button>
      <plat-button>t</plat-button>
  </div>
</template>

<script>
  import PlatButtonSingle from './PlatButton.vue';
  import {PlatButton3, test3} from './PlatButton2.vue';
  import {PlatButton, test} from './PlatButton.vue';
  import {PlatButtonComp} from './PlatButton2.vue';

  export default {
    components : {
      'plat-button' : PlatButtonSingle,
        'plat-button2' : test3,
        'plat-button3' : PlatButton,
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
