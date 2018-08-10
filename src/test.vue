<template>
  <h2>Hello from {{text}}</h2>
</template>

<script>
import CompanionServer from './lib/CompanionServer';

export default {
  name: 'test',
  data () {
    return {
       text: ''
    }
  },
  mounted() {
    CompanionServer.initialize();
    CompanionServer.open();
  }
}
</script>
