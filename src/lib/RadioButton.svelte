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
	.radio-button {
		font-weight: 500;
		border: none;
		background: var(--inactive);
	}
	.radio-button.active {
		color: white;
		background: var(--accent);
	}
</style>
