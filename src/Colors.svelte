<script>
    let colors = [
        { title: "primary", rgb: "110,65,255", hex: "#6e41ff" },
        { title: "secondary", rgb: "245,249,254", hex: "#f5f9fe" },
        { title: "primary-b", rgb: "208,208,208", hex: "#d0d0d0" },
        { title: "secondary-c", rgb: "51,51,51", hex: "#333333" },
        { title: "secondary-b", rgb: "102,102,102", hex: "#666666" },
    ];
</script>

<div class="style-guide__row border-bottom">
    <div class="style-guide__colors">
        <div class="style-guide__colors__container">
            <span class="title-section">COLORS</span>
            {#each colors as color}
                <div class="style-guide__colors__color">
                    <div class="style-guide__colors__color__rect" style="{`background-color: ${color.hex};`}"/>
                    <span class="style-guide__colors__color__title"></span>
                    <span class="style-guide__colors__color__ref">{color.rgb}</span>
                    <span class="style-guide__colors__color__ref">{color.hex}</span>
                </div>
            {/each}
        </div>
    </div>
</div>

<style>
</style>
