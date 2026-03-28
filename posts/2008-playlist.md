---
title: 2008 Playlist — Interactive Test
date: 2026-03-28
category: MISC
tags: [neocities, web, meta]
excerpt:  collection of the most-played tracks from 2008 across a few genres. Highlights  **April 2008** specifically.
---

# 2008 Playlist — Club / Dance · R&B · Rock · Alt

List - Does it work still

<div id="playlist-root"></div>

<style>
#playlist-root { font-family: inherit; margin: 1.5rem 0; }
.pl-controls { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px; align-items: center; }
.pl-btn { font-size: 12px; font-weight: 600; padding: 5px 14px; border-radius: 20px; border: 1.5px solid #ccc; background: transparent; color: #555; cursor: pointer; transition: all .15s; }
.pl-btn.active, .pl-btn:hover { background: #111; color: #fff; border-color: #111; }
.pl-search { padding: 5px 12px; border-radius: 20px; border: 1.5px solid #ccc; background: transparent; font-size: 12px; outline: none; min-width: 180px; color: inherit; }
.pl-search::placeholder { color: #aaa; }
.pl-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.pl-table th { font-size: 10px; font-weight: 700; letter-spacing: .07em; text-transform: uppercase; color: #888; padding: 6px 10px; text-align: left; border-bottom: 2px solid #e5e5e5; cursor: pointer; user-select: none; white-space: nowrap; }
.pl-table th:hover { color: #111; }
.pl-table td { padding: 8px 10px; border-bottom: 1px solid #f0f0f0; vertical-align: middle; }
.pl-table tr:last-child td { border-bottom: none; }
.pl-table tr.april td { background: rgba(250, 195, 70, 0.08); }
.pl-thumb { width: 64px; height: 36px; object-fit: cover; border-radius: 4px; display: block; background: #f0f0f0; }
.pl-thumb-wrap { position: relative; width: 64px; height: 36px; flex-shrink: 0; }
.pl-thumb-placeholder { width: 64px; height: 36px; border-radius: 4px; background: #e8e8e8; display: flex; align-items: center; justify-content: center; }
.pl-artist { font-weight: 600; font-size: 13px; color: inherit; }
.pl-song { font-size: 12px; color: #777; margin-top: 2px; }
.pl-cell-track { display: flex; align-items: center; gap: 10px; }
.pl-pill { display: inline-block; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 10px; white-space: nowrap; }
.pl-club  { background: #d0f0e4; color: #06503c; }
.pl-rb    { background: #e8e6fd; color: #3a2e8a; }
.pl-rock  { background: #fde4db; color: #6e2410; }
.pl-alt   { background: #fdebd0; color: #5c3407; }
.pl-apr   { display: inline-block; font-size: 9px; font-weight: 700; padding: 1px 6px; border-radius: 6px; background: #f9c550; color: #3d2000; margin-left: 4px; vertical-align: middle; }
.pl-yt { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 600; color: #c00; text-decoration: none; padding: 3px 8px; border-radius: 7px; border: 1px solid #f0c0c0; white-space: nowrap; }
.pl-yt:hover { background: #fff0f0; }
.pl-yt svg { flex-shrink: 0; }
.pl-date { font-size: 11px; color: #888; white-space: nowrap; }
.pl-rank { font-size: 11px; color: #bbb; font-weight: 600; min-width: 22px; }
.pl-count { font-size: 11px; color: #999; margin-top: 10px; }
.pl-sort-arrow { opacity: .35; margin-left: 2px; font-size: 9px; }
.pl-sort-arrow.on { opacity: 1; }
@media (max-width: 600px) {
  .pl-table th:nth-child(3), .pl-table td:nth-child(3) { display: none; }
}
</style>

<script>
(function() {
  const TRACKS = [
    // ── CLUB / DANCE ──
    {rank:1,  artist:"Bob Sinclar & Steve Edwards",    song:"Together",                         genre:"Club/Dance", april:false, date:"2008-03-21", vid:"Jy1ZNZEjsWU"},
    {rank:2,  artist:"Erin Hamilton",                  song:"Control Yourself",                 genre:"Club/Dance", april:false, date:"2008-06-01", vid:null},
    {rank:3,  artist:"Mark Picchiotti ft. Basstoy",    song:"Turn It Up",                       genre:"Club/Dance", april:false, date:"2008-01-01", vid:null},
    {rank:4,  artist:"Kristine W",                     song:"The Boss",                         genre:"Club/Dance", april:false, date:"2008-02-12", vid:null},
    {rank:5,  artist:"Janet Jackson",                  song:"Feedback",                         genre:"Club/Dance", april:false, date:"2008-01-07", vid:"v5kBXBBTPfA"},
    {rank:6,  artist:"Bimbo Jones",                    song:"And I Try",                        genre:"Club/Dance", april:false, date:"2008-02-01", vid:null},
    {rank:7,  artist:"Georgie Porgie",                 song:"Can You Feel That Sound",          genre:"Club/Dance", april:false, date:"2008-01-01", vid:null},
    {rank:8,  artist:"Yoko Ono",                       song:"No No No (remix)",                 genre:"Club/Dance", april:false, date:"2008-03-01", vid:null},
    {rank:9,  artist:"Ultra Naté ft. Chris Willis",    song:"Give It All You Got",              genre:"Club/Dance", april:false, date:"2008-01-01", vid:null},
    {rank:10, artist:"Dave Gahan",                     song:"Kingdom",                          genre:"Club/Dance", april:false, date:"2007-11-01", vid:"8C3yMFNalNI"},
    {rank:11, artist:"Kimberley Locke",                song:"Band of Gold",                     genre:"Club/Dance", april:false, date:"2008-01-01", vid:null},
    {rank:12, artist:"Madonna ft. Justin Timberlake",  song:"4 Minutes",                        genre:"Club/Dance", april:true,  date:"2008-04-01", vid:"AuEbLHHT88w"},
    {rank:13, artist:"Donna Summer",                   song:"Stamp Your Feet",                  genre:"Club/Dance", april:false, date:"2008-03-11", vid:"PCuTX5mSqYo"},
    {rank:14, artist:"Lady Gaga",                      song:"Just Dance",                       genre:"Club/Dance", april:false, date:"2008-04-08", vid:"2Abk1ziEFLs"},
    {rank:15, artist:"Britney Spears",                 song:"Piece of Me",                      genre:"Club/Dance", april:false, date:"2008-01-04", vid:"SUhdnMVAMDg"},
    {rank:16, artist:"Madonna",                        song:"Give It 2 Me",                     genre:"Club/Dance", april:false, date:"2008-06-17", vid:"1E4EQQHkFzI"},
    {rank:17, artist:"Donna Summer",                   song:"I'm a Fire",                       genre:"Club/Dance", april:false, date:"2008-06-01", vid:null},
    {rank:18, artist:"Natasha Bedingfield",            song:"Pocketful of Sunshine",            genre:"Club/Dance", april:false, date:"2008-01-29", vid:"aFNidKFt6f8"},
    {rank:19, artist:"Natasha Bedingfield",            song:"Love Like This",                   genre:"Club/Dance", april:false, date:"2008-08-01", vid:"Sv9KLuMuqVM"},
    {rank:20, artist:"Yoko Ono",                       song:"Give Peace a Chance (remix)",      genre:"Club/Dance", april:false, date:"2008-09-01", vid:null},
    {rank:21, artist:"Celine Dion",                    song:"Taking Chances",                   genre:"Club/Dance", april:false, date:"2007-10-23", vid:"D5drYkLiLI8"},
    {rank:22, artist:"Cyndi Lauper",                   song:"Into the Nightlife",               genre:"Club/Dance", april:false, date:"2008-07-22", vid:"S9r7MZKGLJI"},
    {rank:23, artist:"Moby",                           song:"Disco Lies",                       genre:"Club/Dance", april:false, date:"2008-04-14", vid:"k-Zu_2IfJn0"},
    {rank:24, artist:"Kylie Minogue",                  song:"In My Arms",                       genre:"Club/Dance", april:true,  date:"2008-04-07", vid:"OniNYBxTMFo"},
    {rank:25, artist:"Katy Perry",                     song:"I Kissed a Girl",                  genre:"Club/Dance", april:false, date:"2008-05-07", vid:"tAp9BKosZXs"},
    {rank:26, artist:"Britney Spears",                 song:"Break the Ice",                    genre:"Club/Dance", april:false, date:"2008-02-18", vid:"DvSBSXBTBXE"},
    {rank:27, artist:"Solange",                        song:"Sandcastle Disco",                 genre:"Club/Dance", april:false, date:"2008-06-10", vid:null},
    {rank:28, artist:"Kimberley Locke",                song:"Fall",                             genre:"Club/Dance", april:false, date:"2008-09-01", vid:null},
    {rank:29, artist:"Mary J. Blige",                  song:"Just Fine",                        genre:"Club/Dance", april:false, date:"2007-12-18", vid:"XxmFMgrMMDs"},
    {rank:30, artist:"Mariah Carey",                   song:"Touch My Body",                    genre:"Club/Dance", april:false, date:"2008-02-26", vid:"1Nn48PnMFAU"},
    {rank:31, artist:"Rihanna",                        song:"Disturbia",                        genre:"Club/Dance", april:false, date:"2008-07-22", vid:"E3jS3bIGgQg"},
    {rank:32, artist:"Britney Spears",                 song:"Womanizer",                        genre:"Club/Dance", april:false, date:"2008-10-26", vid:"LNVG2WKtjSs"},
    {rank:33, artist:"Lady Gaga",                      song:"Poker Face",                       genre:"Club/Dance", april:false, date:"2008-09-26", vid:"bESGLojNYSo"},
    {rank:34, artist:"Beyoncé",                        song:"Single Ladies (Put a Ring on It)", genre:"Club/Dance", april:false, date:"2008-10-08", vid:"4m1EFMoRFvY"},
    {rank:35, artist:"Bob Sinclar",                    song:"What I Want",                      genre:"Club/Dance", april:false, date:"2008-09-01", vid:null},
    // ── R&B ──
    {rank:51, artist:"Usher ft. Young Jeezy",          song:"Love in This Club",                genre:"R&B",        april:true,  date:"2008-03-11", vid:"gBEBPZOKcQc"},
    {rank:52, artist:"T.I.",                           song:"Whatever You Like",                genre:"R&B",        april:false, date:"2008-08-12", vid:"JiMu2R1CmM4"},
    {rank:53, artist:"T.I. ft. Rihanna",               song:"Live Your Life",                   genre:"R&B",        april:false, date:"2008-09-01", vid:"koVHN6eO4Xg"},
    {rank:54, artist:"Lil Wayne ft. Static Major",     song:"Lollipop",                         genre:"R&B",        april:false, date:"2008-03-17", vid:"_AwNTMHSblc"},
    {rank:55, artist:"Beyoncé",                        song:"If I Were a Boy",                  genre:"R&B",        april:false, date:"2008-10-08", vid:"AWpsOqh8q0M"},
    {rank:56, artist:"Rihanna",                        song:"Take a Bow",                       genre:"R&B",        april:false, date:"2008-04-14", vid:"JQgA7N3HEhk"},
    {rank:57, artist:"Rihanna",                        song:"Don't Stop the Music",             genre:"R&B",        april:false, date:"2007-11-02", vid:"GnEBgxGiRq8"},
    {rank:58, artist:"Alicia Keys",                    song:"No One",                           genre:"R&B",        april:false, date:"2007-09-25", vid:"7bm_HMGiCko"},
    {rank:59, artist:"Alicia Keys",                    song:"Like You'll Never See Me Again",   genre:"R&B",        april:false, date:"2008-01-29", vid:"WdEDl0VaFkI"},
    {rank:60, artist:"Alicia Keys",                    song:"Teenage Love Affair",              genre:"R&B",        april:false, date:"2008-05-06", vid:"U_bP-Qn4h5E"},
    {rank:61, artist:"Ne-Yo",                          song:"Miss Independent",                 genre:"R&B",        april:false, date:"2008-06-24", vid:"vOdBGZ4Uccs"},
    {rank:62, artist:"Ne-Yo",                          song:"Closer",                           genre:"R&B",        april:false, date:"2008-09-09", vid:"m_DpcrgHe0w"},
    {rank:63, artist:"Keyshia Cole",                   song:"I Remember",                       genre:"R&B",        april:false, date:"2008-01-29", vid:null},
    {rank:64, artist:"Keyshia Cole",                   song:"Heaven Sent",                      genre:"R&B",        april:false, date:"2008-07-01", vid:null},
    {rank:65, artist:"Flo Rida ft. T-Pain",            song:"Low",                              genre:"R&B",        april:false, date:"2007-12-10", vid:"lKpAuRiQKDE"},
    {rank:66, artist:"Flo Rida",                       song:"In the Ayer",                      genre:"R&B",        april:false, date:"2008-06-17", vid:"BQXKsMOz_u8"},
    {rank:67, artist:"Chris Brown",                    song:"Take You Down",                    genre:"R&B",        april:false, date:"2008-04-22", vid:"3xB02FaC8HE"},
    {rank:68, artist:"Jordin Sparks & Chris Brown",    song:"No Air",                           genre:"R&B",        april:false, date:"2008-02-26", vid:"oKBNJ1oE1JA"},
    {rank:69, artist:"Jennifer Hudson",                song:"Spotlight",                        genre:"R&B",        april:false, date:"2008-07-22", vid:"7HWaBzUoB84"},
    {rank:70, artist:"Jazmine Sullivan",               song:"Need U Bad",                       genre:"R&B",        april:false, date:"2008-07-08", vid:"t-iGjOs-4go"},
    {rank:71, artist:"Estelle ft. Kanye West",         song:"American Boy",                     genre:"R&B",        april:true,  date:"2008-03-31", vid:"uqRBiMCOQhk"},
    {rank:72, artist:"J. Holiday",                     song:"Suffocate",                        genre:"R&B",        april:false, date:"2007-10-30", vid:"kKGnV2z1f3I"},
    {rank:73, artist:"Trey Songz",                     song:"Last Time",                        genre:"R&B",        april:false, date:"2008-04-29", vid:null},
    {rank:74, artist:"Mario",                          song:"Crying Out for Me",                genre:"R&B",        april:false, date:"2008-01-01", vid:"Bz_-xBqDjaE"},
    {rank:75, artist:"Usher",                          song:"Love in This Club Pt. II",         genre:"R&B",        april:false, date:"2008-06-10", vid:"U8FnXCaIhTs"},
    {rank:76, artist:"Lil Wayne ft. T-Pain",           song:"Got Money",                        genre:"R&B",        april:false, date:"2008-08-26", vid:"SdBbRRLuCGs"},
    {rank:77, artist:"Plies ft. Ne-Yo",                song:"Bust It Baby Pt. 2",               genre:"R&B",        april:false, date:"2008-01-29", vid:"IvKNEi1KjMQ"},
    // ── ROCK ──
    {rank:101,artist:"Coldplay",                       song:"Viva La Vida",                     genre:"Rock",       april:false, date:"2008-05-22", vid:"dvgZkm1xWPE"},
    {rank:102,artist:"Coldplay",                       song:"Violet Hill",                      genre:"Rock",       april:true,  date:"2008-04-29", vid:"nDeEMNaBIkI"},
    {rank:103,artist:"Kings of Leon",                  song:"Sex on Fire",                      genre:"Rock",       april:false, date:"2008-09-19", vid:"gKqtBXR8O_g"},
    {rank:104,artist:"Kings of Leon",                  song:"Use Somebody",                     genre:"Rock",       april:false, date:"2008-09-19", vid:"gnhXHvRoUd0"},
    {rank:105,artist:"Nickelback",                     song:"Gotta Be Somebody",                genre:"Rock",       april:false, date:"2008-08-25", vid:"UE9T4UD5d5w"},
    {rank:106,artist:"Nickelback",                     song:"Something in Your Mouth",          genre:"Rock",       april:false, date:"2008-11-18", vid:"mFw7_QFWEjA"},
    {rank:107,artist:"Nickelback",                     song:"Never Gonna Be Alone",             genre:"Rock",       april:false, date:"2008-08-25", vid:"CfZJBBnFhNg"},
    {rank:108,artist:"Kid Rock",                       song:"All Summer Long",                  genre:"Rock",       april:false, date:"2008-05-05", vid:"hoFNBgKANMQ"},
    {rank:109,artist:"Shinedown",                      song:"Second Chance",                    genre:"Rock",       april:false, date:"2008-10-07", vid:"rF2JsPokHos"},
    {rank:110,artist:"Shinedown",                      song:"Devour",                           genre:"Rock",       april:false, date:"2008-07-15", vid:"FdRjWJ58kaI"},
    {rank:111,artist:"Disturbed",                      song:"Inside the Fire",                  genre:"Rock",       april:false, date:"2008-03-04", vid:"Cl5Vkd4N0E8"},
    {rank:112,artist:"Disturbed",                      song:"Indestructible",                   genre:"Rock",       april:false, date:"2008-06-03", vid:"CLrSCHFiAV4"},
    {rank:113,artist:"Foo Fighters",                   song:"The Pretender",                    genre:"Rock",       april:false, date:"2007-09-18", vid:"SBjQ9tuuTJQ"},
    {rank:114,artist:"Foo Fighters",                   song:"Let It Die",                       genre:"Rock",       april:false, date:"2008-05-01", vid:"FRbhPK-IiVQ"},
    {rank:115,artist:"Seether",                        song:"Rise Above This",                  genre:"Rock",       april:false, date:"2007-10-30", vid:"0P-0pMzMg5s"},
    {rank:116,artist:"Seether",                        song:"Breakdown",                        genre:"Rock",       april:true,  date:"2008-04-01", vid:"uRjWQQxDvA0"},
    {rank:117,artist:"Metallica",                      song:"The Day That Never Comes",         genre:"Rock",       april:false, date:"2008-08-18", vid:"kfYVC-XQjZY"},
    {rank:118,artist:"Metallica",                      song:"Cyanide",                          genre:"Rock",       april:false, date:"2008-09-12", vid:"RQemynhYA_4"},
    {rank:119,artist:"3 Doors Down",                   song:"It's Not My Time",                 genre:"Rock",       april:true,  date:"2008-04-29", vid:"RKEBFDyiXw4"},
    {rank:120,artist:"Saving Abel",                    song:"Addicted",                         genre:"Rock",       april:false, date:"2008-01-29", vid:"vkl8Lg3n_Hg"},
    {rank:121,artist:"Theory of a Deadman",            song:"Bad Girlfriend",                   genre:"Rock",       april:false, date:"2008-09-01", vid:"I6ACWkC5b0Y"},
    {rank:122,artist:"Staind",                         song:"Believe",                          genre:"Rock",       april:true,  date:"2008-04-08", vid:"7OGZXpkLRhg"},
    {rank:123,artist:"Weezer",                         song:"Pork and Beans",                   genre:"Rock",       april:false, date:"2008-05-13", vid:"YCDS7mbtqfc"},
    {rank:124,artist:"Slipknot",                       song:"All Hope Is Gone",                 genre:"Rock",       april:false, date:"2008-08-26", vid:"xaYYumA2HY0"},
    // ── ALT / INDIE ──
    {rank:151,artist:"Panic! at the Disco",            song:"Nine in the Afternoon",            genre:"Alt/Indie",  april:true,  date:"2008-03-18", vid:"PqUCkMnTM7Y"},
    {rank:152,artist:"Panic! at the Disco",            song:"That Green Gentleman",             genre:"Alt/Indie",  april:false, date:"2008-06-10", vid:"L7G5DGOLHHY"},
    {rank:153,artist:"Fall Out Boy",                   song:"I Don't Care",                     genre:"Alt/Indie",  april:true,  date:"2008-06-10", vid:"hEMHOMXqFBE"},
    {rank:154,artist:"Fall Out Boy",                   song:"What a Catch, Donnie",             genre:"Alt/Indie",  april:false, date:"2008-09-16", vid:"8_5kLzFXWJo"},
    {rank:155,artist:"Paramore",                       song:"That's What You Get",              genre:"Alt/Indie",  april:false, date:"2008-02-12", vid:"cMg8KFqEs88"},
    {rank:156,artist:"Paramore",                       song:"Decode",                           genre:"Alt/Indie",  april:false, date:"2008-10-21", vid:"o4XQ5H_QEj0"},
    {rank:157,artist:"The Offspring",                  song:"You're Gonna Go Far, Kid",         genre:"Alt/Indie",  april:false, date:"2008-02-26", vid:"Nf6udRiudFw"},
    {rank:158,artist:"The Offspring",                  song:"Hammerhead",                       genre:"Alt/Indie",  april:false, date:"2008-01-29", vid:"9IfNwSsD1yg"},
    {rank:159,artist:"Cage the Elephant",              song:"Ain't No Rest for the Wicked",     genre:"Alt/Indie",  april:false, date:"2008-05-23", vid:"uNOHSOaHiS8"},
    {rank:160,artist:"M.I.A.",                         song:"Paper Planes",                     genre:"Alt/Indie",  april:false, date:"2007-08-22", vid:"ewRjZoY9se4"},
    {rank:161,artist:"Jason Mraz",                     song:"I'm Yours",                        genre:"Alt/Indie",  april:false, date:"2008-07-15", vid:"EkHTsc9PU2A"},
    {rank:162,artist:"Linkin Park",                    song:"Bleed It Out",                     genre:"Alt/Indie",  april:false, date:"2007-06-26", vid:"3HBeCnSGVoI"},
    {rank:163,artist:"Incubus",                        song:"Love Hurts",                       genre:"Alt/Indie",  april:false, date:"2008-07-08", vid:"RKnE6hgRTbQ"},
  ];

  function fmtDate(d) {
    const [y,m,day] = d.split('-');
    const mo = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return mo[parseInt(m)-1]+' '+parseInt(day)+', '+y;
  }
  function ytSearch(artist, song) {
    return 'https://www.youtube.com/results?search_query='+encodeURIComponent(artist+' '+song+' official');
  }
  function ytWatch(vid) { return 'https://www.youtube.com/watch?v='+vid; }
  function thumb(vid) { return vid ? 'https://img.youtube.com/vi/'+vid+'/mqdefault.jpg' : null; }
  function genreClass(g) {
    return {'Club/Dance':'pl-club','R&B':'pl-rb','Rock':'pl-rock','Alt/Indie':'pl-alt'}[g]||'pl-alt';
  }

  let filter = 'all', sortKey = 'rank', sortDir = 1;

  function build() {
    const root = document.getElementById('playlist-root');
    root.innerHTML = `
      <div class="pl-controls">
        <button class="pl-btn active" data-f="all">All</button>
        <button class="pl-btn" data-f="Club/Dance">Club / Dance</button>
        <button class="pl-btn" data-f="R&B">R&amp;B</button>
        <button class="pl-btn" data-f="Rock">Rock</button>
        <button class="pl-btn" data-f="Alt/Indie">Alt / Indie</button>
        <button class="pl-btn" data-f="april">April 2008</button>
        <input class="pl-search" id="pl-q" placeholder="Search artist or song…">
      </div>
      <table class="pl-table">
        <thead><tr>
          <th data-k="rank">#</th>
          <th data-k="artist">Artist / Song</th>
          <th data-k="date">Released</th>
          <th data-k="genre">Genre</th>
          <th>Video</th>
        </tr></thead>
        <tbody id="pl-body"></tbody>
      </table>
      <div class="pl-count" id="pl-count"></div>`;

    root.querySelectorAll('.pl-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        root.querySelectorAll('.pl-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        filter = btn.dataset.f;
        render();
      });
    });
    root.querySelectorAll('th[data-k]').forEach(th => {
      th.addEventListener('click', () => {
        const k = th.dataset.k;
        if (sortKey === k) sortDir *= -1; else { sortKey = k; sortDir = 1; }
        root.querySelectorAll('th[data-k]').forEach(h => { h.innerHTML = h.innerHTML.replace(/ [▲▼]$/,''); });
        th.innerHTML += sortDir === 1 ? ' ▲' : ' ▼';
        render();
      });
    });
    document.getElementById('pl-q').addEventListener('input', render);
    render();
  }

  function render() {
    const q = (document.getElementById('pl-q')||{value:''}).value.toLowerCase();
    let data = TRACKS.filter(r => {
      if (filter === 'april') return r.april;
      if (filter !== 'all' && r.genre !== filter) return false;
      if (q && !r.artist.toLowerCase().includes(q) && !r.song.toLowerCase().includes(q)) return false;
      return true;
    });
    data.sort((a,b) => {
      let av = sortKey==='date' ? a.date : sortKey==='rank' ? a.rank : a[sortKey];
      let bv = sortKey==='date' ? b.date : sortKey==='rank' ? b.rank : b[sortKey];
      if (typeof av==='string') av=av.toLowerCase();
      if (typeof bv==='string') bv=bv.toLowerCase();
      return av<bv?-sortDir:av>bv?sortDir:0;
    });
    const tbody = document.getElementById('pl-body');
    tbody.innerHTML = data.map((r,i) => {
      const t = thumb(r.vid);
      const link = r.vid ? ytWatch(r.vid) : ytSearch(r.artist, r.song);
      const imgEl = t
        ? `<img class="pl-thumb" src="${t}" alt="${r.artist} ${r.song}" loading="lazy" onerror="this.style.display='none';this.nextSibling.style.display='flex'">`
          +`<div class="pl-thumb-placeholder" style="display:none"><svg width="16" height="16" viewBox="0 0 24 24" fill="#bbb"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1C24 15.9 24 12 24 12s0-3.9-.5-5.8zM9.8 15.5V8.5l6.3 3.5-6.3 3.5z"/></svg></div>`
        : `<div class="pl-thumb-placeholder"><svg width="16" height="16" viewBox="0 0 24 24" fill="#bbb"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1C24 15.9 24 12 24 12s0-3.9-.5-5.8zM9.8 15.5V8.5l6.3 3.5-6.3 3.5z"/></svg></div>`;
      return `<tr class="${r.april?'april':''}">
        <td class="pl-rank">${i+1}</td>
        <td><div class="pl-cell-track">
          <div class="pl-thumb-wrap">${imgEl}</div>
          <div><div class="pl-artist">${r.artist}</div>
          <div class="pl-song">${r.song}${r.april?' <span class="pl-apr">APR</span>':''}</div></div>
        </div></td>
        <td class="pl-date">${fmtDate(r.date)}</td>
        <td><span class="pl-pill ${genreClass(r.genre)}">${r.genre}</span></td>
        <td><a class="pl-yt" href="${link}" target="_blank" rel="noopener">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1C24 15.9 24 12 24 12s0-3.9-.5-5.8zM9.8 15.5V8.5l6.3 3.5-6.3 3.5z"/></svg>
          Watch
        </a></td>
      </tr>`;
    }).join('');
    document.getElementById('pl-count').textContent = data.length+' track'+(data.length!==1?'s':'');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', build);
  } else {
    build();
  }
})();
</script>
