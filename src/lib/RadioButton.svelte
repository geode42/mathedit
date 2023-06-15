<script lang="ts">
	export let group = ''
	export let onclick = e => {}
	export let active = false
</script>

<button
	class={`radio-button-group-${group} radio-button ${active ? 'active' : ''}`}
	on:click={e => {
		;[...document.getElementsByClassName(`radio-button-group-${group}`)].forEach(e => e.classList.remove('active'))
		e.target.classList.add('active')
		onclick(e)
	}}
>
	<slot />
</button>

<style>
	.radio-button.active {
		background-color: var(--radio-button-active-background);
		border-color: var(--radio-button-active-border);
	}
</style>
