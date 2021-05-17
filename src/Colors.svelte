<script>
    let colors = [
        { title: "primary", rgb: "52,56,56", hex: "#343838" },
        { title: "primary-b", rgb: "0,95,107", hex: "#005F6B" },
        { title: "secondary-c", rgb: "0,140,158", hex: "#008C9E" },
        { title: "secondary-b", rgb: "0,180,204", hex: "#00B4CC" },
        { title: "secondary", rgb: "0,223,252", hex: "#00DFFC" },
    ];
</script>

<div class="style-guide__row border-bottom">
    <div class="style-guide__colors">
        <div class="style-guide__colors__container">
            <span class="title-section">COLORS</span>
            {#each colors as color}
                <div class="style-guide__colors__color">
                    <div class="style-guide__colors__color__rect" style="{`background-color: ${color.hex};`}"/>
                    <span class="style-guide__colors__color__title">{color.title}</span>
                    <span class="style-guide__colors__color__ref">{color.rgb}</span>
                    <span class="style-guide__colors__color__ref">{color.hex}</span>
                </div>
            {/each}
        </div>
    </div>
</div>

<style>
</style>
