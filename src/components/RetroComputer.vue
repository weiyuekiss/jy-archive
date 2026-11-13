<template>
  <svg
    class="retro-computer"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 256 208"
    fill="none"
    shape-rendering="crispEdges"
    role="img"
    aria-label="复古灰色 CRT 电脑，蓝色 Windows 风格窗口、主机、软驱、键盘和鼠标的像素立绘"
    focusable="false"
  >
    <!-- Quiet, stepped ground shadow. -->
    <path fill="#b7adc6" opacity=".2" d="M28 182h200v8h-12v6H40v-6H28z" />
    <path fill="#a59ab6" opacity=".16" d="M44 190h160v6H44z" />

    <!-- Cables stay on the same square pixel grid as the hardware. -->
    <path fill="#6b6677" d="M107 143h3v10h-8v9h-3v-12h8zM213 132h13v5h6v22h-5v8h-3v-11h5v-17h-6v-4h-10z" />
    <path fill="#a9a3b2" d="M108 144h1v8h-8v9h-1v-10h8zM225 140h2v15h-2z" />

    <!-- Tower: a deep case, recessed face, drives and small status LEDs. -->
    <path fill="#565362" d="M180 47h32v4h8v94h-4v5h-39V53h3z" />
    <path fill="#d3d2d0" d="M182 49h28v95h-30V55h2z" />
    <path fill="#f4f1e9" d="M182 49h28v3h-26v90h-4V55h2z" />
    <path fill="#a4a3a8" d="M210 52h6v90h-6z" />
    <path fill="#878592" d="M216 55h2v88h-2zM182 143h32v4h-32z" />
    <path fill="#b8b7bc" d="M186 58h20v21h-20z" />
    <path fill="#777582" d="M186 58h20v2h-20zM186 60h2v17h-2z" />
    <path fill="#efeee7" d="M188 77h18v2h-18zM204 60h2v17h-2z" />
    <path fill="#555260" d="M190 65h12v3h-12z" />
    <path fill="#9693a2" d="M190 65h12v1h-12z" />
    <path fill="#e5e2dc" d="M198 72h4v2h-4z" />
    <path fill="#86828f" d="M186 84h20v14h-20z" />
    <path fill="#bcbac1" d="M188 86h18v10h-18z" />
    <path fill="#504d5c" d="M190 88h12v3h-12z" />
    <path fill="#e7e4de" d="M199 93h4v2h-4z" />
    <path fill="#8c8898" d="M188 105h7v7h-7z" />
    <path fill="#ebe8e3" d="M189 106h5v4h-5z" />
    <path fill="#9cbec5" d="M200 106h3v3h-3z" />
    <path fill="#b79ccc" d="M200 113h3v2h-3z" />
    <path fill="#8d8995" d="M188 123h16v2h-16zM188 128h16v2h-16zM188 133h16v2h-16z" />
    <path fill="#ece9e2" d="M188 125h16v1h-16zM188 130h16v1h-16zM188 135h16v1h-16z" />
    <path fill="#625d70" d="M182 147h6v4h-6zM207 147h7v4h-7z" />

    <!-- CRT rear shell: deliberately thick and stepped, not rounded. -->
    <path fill="#575363" d="M43 20h111v4h12v8h6v91h-7v8H42v-5H31V32h5v-8h7z" />
    <path fill="#a4a3ac" d="M146 25h16v9h7v86h-7v7h-16z" />
    <path fill="#c5c4c8" d="M145 25h15v6h-15zM160 34h6v77h-6z" />
    <path fill="#85818f" d="M163 42h3v5h-3zM163 51h3v5h-3zM163 60h3v5h-3zM163 69h3v5h-3zM163 78h3v5h-3zM163 87h3v5h-3zM160 113h7v7h-7z" />
    <path fill="#dbd9d5" d="M39 25h109v4h9v94h-8v5H39v-5h-5V33h5z" />
    <path fill="#faf6ed" d="M41 25h107v3H41zM37 32h4v85h-4zM41 29h5v3h-5z" />
    <path fill="#b7b5bc" d="M149 32h6v88h-6zM41 121h108v5H41z" />
    <path fill="#ebe8e0" d="M43 113h104v7H43z" />

    <!-- Recessed bezel and blue glass. -->
    <path fill="#97929f" d="M47 36h94v4h5v65h-5v4H47v-4h-4V40h4z" />
    <path fill="#5c586b" d="M49 40h90v3h4v59h-4v3H49v-3h-3V43h3z" />
    <path fill="#3d4675" d="M51 43h85v3h4v54h-4v3H51v-3h-3V46h3z" />
    <path fill="#7397c2" d="M52 45h83v3h3v50h-3v3H52v-3h-2V48h2z" />
    <path fill="#8aafd0" d="M52 45h83v3H52zM50 48h3v47h-3z" />
    <path fill="#6284b4" d="M135 50h3v48h-3zM53 97h82v4H53z" />

    <!-- Tiny desktop icons: computer, folder, and recycle bin. -->
    <path fill="#384970" d="M56 51h10v8H56zM58 60h6v2h-6z" />
    <path fill="#e9e8e4" d="M57 51h8v6h-8zM59 58h4v2h-4z" />
    <path fill="#9dc9df" d="M58 52h6v4h-6z" />
    <path fill="#d7c8e3" d="M55 64h12v1H55z" />
    <path fill="#d3b3cc" d="M56 70h5v2h6v7H56z" />
    <path fill="#f3d5de" d="M57 72h9v2h-9z" />
    <path fill="#d7c8e3" d="M55 81h12v1H55z" />
    <path fill="#e0e4e7" d="M58 86h7v2h-1v6h-5v-6h-1z" />
    <path fill="#9cacc7" d="M60 89h1v4h-1zM62 89h1v4h-1z" />

    <!-- Classic beveled window, title bar and pixel-sized controls. -->
    <path fill="#45547c" d="M74 55h57v39H74z" />
    <path fill="#d6d5dc" d="M72 53h57v39H72z" />
    <path fill="#fff8ef" d="M72 53h57v1H72zM72 54h1v37h-1z" />
    <path fill="#777589" d="M128 54h1v38h-1zM73 91h55v1H73z" />
    <path fill="#4d5e9c" d="M75 56h51v7H75z" />
    <path fill="#bcb7d9" d="M77 58h3v3h-3z" />
    <path fill="#e8e6f0" d="M82 58h12v1H82zM82 60h8v1h-8z" />
    <path fill="#dedde2" d="M112 57h5v5h-5zM119 57h5v5h-5z" />
    <path fill="#60627c" d="M113 60h3v1h-3zM120 58h1v1h-1zM122 58h1v1h-1zM121 59h1v1h-1zM120 60h1v1h-1zM122 60h1v1h-1z" />
    <path fill="#8c8799" d="M77 65h7v1h-7zM87 65h9v1h-9zM99 65h6v1h-6z" />
    <path fill="#9791a6" d="M76 69h49v17H76z" />
    <path fill="#f3f0eb" d="M77 70h47v15H77z" />
    <path fill="#a8a5c9" d="M80 73h7v8h-7z" />
    <path fill="#d5bddc" d="M81 74h5v3h-5z" />
    <path fill="#9397b2" d="M91 73h24v2H91zM91 77h19v1H91zM91 80h23v1H91z" />
    <path fill="#f5f1ed" d="M108 87h16v1h-16z" />
    <path fill="#9c96ab" d="M109 89h15v1h-15zM123 88h1v1h-1z" />
    <!-- Desktop task bar, including a four-color start mark. -->
    <path fill="#d1d2dc" d="M52 96h83v5H52z" />
    <path fill="#f3f0ee" d="M52 96h83v1H52zM54 98h17v1H54z" />
    <path fill="#b78cb7" d="M55 98h2v1h-2z" />
    <path fill="#8596c8" d="M58 98h2v1h-2z" />
    <path fill="#8b879e" d="M63 98h6v1h-6zM75 98h20v1H75zM123 98h8v1h-8z" />
    <path fill="#b4cccf" d="M50 115h5v2h-5z" />
    <path fill="#8a8697" d="M123 114h8v4h-8zM135 114h8v4h-8z" />
    <path fill="#d8b1ce" d="M125 115h4v2h-4z" />
    <path fill="#a5c6ce" d="M137 115h4v2h-4z" />

    <!-- Pedestal with a broad, beveled foot. -->
    <path fill="#5d586b" d="M81 128h37v12h14v4h7v9H62v-9h7v-4h12z" />
    <path fill="#aaa7b2" d="M84 128h31v13H84z" />
    <path fill="#dbd8d5" d="M84 128h24v10H84z" />
    <path fill="#efebe4" d="M83 139h32v3h14v3H71v-3h12z" />
    <path fill="#cac7cc" d="M67 146h67v5H67z" />
    <path fill="#93909f" d="M68 150h66v2H68zM111 129h4v10h-4z" />

    <!-- Keyboard: stepped silhouette, four rows of individually beveled keys. -->
    <path fill="#5e596c" d="M36 157h121v5h6v8h6v16h-5v4H24v-4h-4v-10h5v-9h5v-6h6z" />
    <path fill="#e0dcd9" d="M37 159h118v5h6v8h5v12H24v-7h4v-8h5v-6h4z" />
    <path fill="#f5efe7" d="M37 159h118v2H37zM33 164h3v5h-3zM28 170h3v7h-3zM24 178h3v6h-3z" />
    <path fill="#a8a3b0" d="M25 184h139v4H25zM159 173h5v11h-5z" />
    <g v-for="(row, index) in [0, 1, 2]" :key="row" :transform="`translate(${39 - index * 4} ${164 + index * 6})`">
      <g v-for="key in 13" :key="key" :transform="`translate(${(key - 1) * 8} 0)`">
        <path fill="#928b9e" d="M0 0h6v4H0z" />
        <path fill="#f5efe9" d="M0 0h5v2H0z" />
        <path fill="#c8c1cb" d="M1 2h4v1H1z" />
      </g>
    </g>
    <path fill="#9a91a6" d="M32 181h12v3H32zM48 181h9v3h-9zM61 181h53v3H61zM118 181h10v3h-10zM132 181h20v3h-20z" />
    <path fill="#f8f0e9" d="M33 180h10v2H33zM49 180h7v2h-7zM62 180h51v2H62zM119 180h8v2h-8zM133 180h18v2h-18z" />
    <path fill="#c7b2d5" d="M143 164h7v3h-7z" />
    <path fill="#d6aec6" d="M144 170h9v3h-9z" />

    <!-- Wired two-button mouse, drawn entirely with square steps. -->
    <path fill="#605b6f" d="M207 160h13v4h5v7h3v12h-4v5h-18v-4h-5v-17h3v-4h3z" />
    <path fill="#d8d4d6" d="M208 162h11v4h4v7h3v9h-4v4h-15v-4h-4v-13h3v-4h2z" />
    <path fill="#faf2e9" d="M208 162h10v2h-9v4h-3v12h-2v-11h2v-4h2z" />
    <path fill="#aaa3b4" d="M221 173h5v9h-4v4h-15v-2h12v-4h2z" />
    <path fill="#91899f" d="M213 163h2v11h-2zM205 173h17v2h-17z" />
    <path fill="#d7b2ce" d="M216 166h3v5h-3z" />

    <!-- A small lavender floppy disk beside the keyboard. -->
    <path fill="#625a76" d="M173 164h18v3h3v22h-21z" />
    <path fill="#b5a1cc" d="M175 166h14v3h3v18h-17z" />
    <path fill="#dfdce5" d="M178 166h9v8h-9z" />
    <path fill="#7b738e" d="M183 167h3v5h-3z" />
    <path fill="#f4e8ec" d="M178 178h11v8h-11z" />
    <path fill="#c8aec9" d="M180 180h7v1h-7zM180 183h5v1h-5z" />
  </svg>
</template>

<style scoped>
.retro-computer {
  display: block;
  width: 100%;
  height: auto;
  image-rendering: pixelated;
}
</style>
