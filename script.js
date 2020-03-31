!function(t){function i(i,a){this.settings=t.extend(!0,e,a),this.$context=i,this.domAudio=this.$context.find("audio")[0],this.$domPlaylist=this.$context.find(".jAudio--playlist"),this.$domControls=this.$context.find(".jAudio--controls"),this.$domVolumeBar=this.$context.find(".jAudio--volume"),this.$domDetails=this.$context.find(".jAudio--details"),this.$domStatusBar=this.$context.find(".jAudio--status-bar"),this.$domProgressBar=this.$context.find(".jAudio--progress-bar-wrapper"),this.$domTime=this.$context.find(".jAudio--time"),this.$domElapsedTime=this.$context.find(".jAudio--time-elapsed"),this.$domTotalTime=this.$context.find(".jAudio--time-total"),this.$domThumb=this.$context.find(".jAudio--thumb"),this.currentState="pause",this.currentTrack=this.settings.defaultTrack,this.currentElapsedTime=void 0,this.timer=void 0,this.init()}var a="jAudio",e={playlist:[],defaultAlbum:void 0,defaultArtist:void 0,defaultTrack:0,autoPlay:!1,debug:!1};i.prototype={init:function(){var t=this;t.renderPlaylist(),t.preLoadTrack(),t.highlightTrack(),t.updateTotalTime(),t.events(),t.debug(),t.domAudio.volume=1},play:function(t){var i=this;i.domAudio.play(),"play"!==i.currentState&&(clearInterval(i.timer),i.timer=setInterval(i.run.bind(i),50),i.currentState="play",t.data("action","pause"),t.removeClass("jAudio--control-play"),t.addClass("jAudio--control-pause"),t.toggleClass("active"))},pause:function(t){var i=this;i.domAudio.pause(),clearInterval(i.timer),i.currentState="pause",t.data("action","play"),t.removeClass("jAudio--control-pause"),t.addClass("jAudio--control-play"),t.toggleClass("active")},stop:function(){var t=this;t.domAudio.pause(),t.domAudio.currentTime=0,t.animateProgressBarPosition(),clearInterval(t.timer),t.updateElapsedTime(),t.currentState="stop"},prev:function(){var t,i=this;t=0===i.currentTrack?i.settings.playlist.length-1:i.currentTrack-1,i.changeTrack(t)},next:function(){var t,i=this;t=i.currentTrack===i.settings.playlist.length-1?0:i.currentTrack+1,i.changeTrack(t)},preLoadTrack:function(){var t=this,i=t.settings.defaultTrack;t.changeTrack(i),t.stop()},changeTrack:function(t){var i=this;i.currentTrack=t,i.domAudio.src=i.settings.playlist[t].file,("play"===i.currentState||i.settings.autoPlay)&&i.play(),i.highlightTrack(),i.updateThumb(),i.renderDetails()},events:function(){var i=this;i.$domControls.on("click",".jAudio--control",function(){var a=t(this),e=a.data("action");switch(e){case"prev":i.prev.call(i,a);break;case"next":i.next.call(i,a);break;case"pause":i.pause.call(i,a);break;case"stop":i.stop.call(i,a);break;case"play":i.play.call(i,a)}}),i.$domPlaylist.on("click",".jAudio--playlist-item",function(){var a=t(this),e=(a.data("track"),a.index());i.currentTrack!==e&&i.changeTrack(e)}),i.$domProgressBar.on("click",function(t){i.updateProgressBar(t),i.updateElapsedTime()}),t(i.domAudio).on("loadedmetadata",function(){i.animateProgressBarPosition.call(i),i.updateElapsedTime.call(i),i.updateTotalTime.call(i)})},getAudioSeconds:function(t){var i=this,t=t%60;return t=i.addZero(Math.floor(t),2),t=60>t?t:"00"},getAudioMinutes:function(t){var i=this,t=t/60;return t=i.addZero(Math.floor(t),2),t=60>t?t:"00"},addZero:function(t,i){for(var t=String(t);t.length<i;)t="0"+t;return t},removeZero:function(t,i){for(var t=String(t),a=0;i>a&&"0"===t[0];)t=t.substr(1,t.length),a++;return t},highlightTrack:function(){var t=this,i=t.$domPlaylist.children(),a="active";i.removeClass(a),i.eq(t.currentTrack).addClass(a)},renderDetails:function(){var t=this,i=t.settings.playlist[t.currentTrack],a=(i.file,i.thumb,i.trackName),e=i.trackArtist,r=(i.trackAlbum,"");r+="<p>",r+="<span>"+a+"</span>",r+="<span>"+e+"</span>",r+="</p>",t.$domDetails.html(r)},renderPlaylist:function(){var i=this,a="";t.each(i.settings.playlist,function(t,i){{var e=i.file,r=i.thumb,o=i.trackName,s=i.trackArtist;i.trackAlbum}trackDuration="00:00",a+="<div class='jAudio--playlist-item' data-track='"+e+"'>",a+="<div class='jAudio--playlist-thumb'><img src='"+r+"'></div>",a+="<div class='jAudio--playlist-meta'>",a+="<p class='jAudio--playlist-meta-track-name'>"+o+"</p>",a+="<p class='jAudio--playlist-meta-track-artist'>"+s+"</p>",a+="</div>",a+="</div>"}),i.$domPlaylist.html(a)},run:function(){var t=this;t.animateProgressBarPosition(),t.updateElapsedTime(),t.domAudio.ended&&t.next()},animateProgressBarPosition:function(){var t=this,i=100*t.domAudio.currentTime/t.domAudio.duration+"%",a={width:i};t.$domProgressBar.children().eq(0).css(a)},updateProgressBar:function(t){var i,a,e,r=this;t.offsetX&&(i=t.offsetX),void 0===i&&t.layerX&&(i=t.layerX),a=i/r.$domProgressBar.width(),e=r.domAudio.duration*a,r.domAudio.currentTime=e,r.animateProgressBarPosition()},updateElapsedTime:function(){var t=this,i=t.domAudio.currentTime,a=t.getAudioMinutes(i),e=t.getAudioSeconds(i),r=a+":"+e;t.$domElapsedTime.text(r)},updateTotalTime:function(){var t=this,i=t.domAudio.duration,a=t.getAudioMinutes(i),e=t.getAudioSeconds(i),r=a+":"+e;t.$domTotalTime.text(r)},updateThumb:function(){var t=this,i=t.settings.playlist[t.currentTrack].thumb,a={"background-image":"url("+i+")"};t.$domThumb.css(a)},debug:function(){var t=this;t.settings.debug&&console.log(t.settings)}},t.fn[a]=function(a){var e=function(){return new i(t(this),a)};t(this).each(e)}}(jQuery);
(function(){
  var t = {
    playlist: [
      {trackName: "Artik & Asti Ft. Ramirez & Steff Da Campo X Siks ", trackArtist: " Девочка Танцуй (Gokhan Yavuz Mashup)", file: "http://promodj.com/download/6978494/Artik%20%26%20Asti%20Ft.%20Ramirez%20%26%20Steff%20Da%20Campo%20X%20Siks%20-%20%D0%94%D0%B5%D0%B2%D0%BE%D1%87%D0%BA%D0%B0%20%D0%A2%D0%B0%D0%BD%D1%86%D1%83%D0%B9%20%28Gokhan%20Yavuz%20Mashup%29%20%28promodj.com%29.mp3",thumb: "https://i1.sndcdn.com/artworks-000223646898-8lp8kr-t500x500.jpg"},
{trackName: "2Маши ", trackArtist: " Босая (Dobrynin Radio Edit)", file: "http://promodj.com/download/6978290/2%D0%9C%D0%B0%D1%88%D0%B8%20-%20%D0%91%D0%BE%D1%81%D0%B0%D1%8F%20%28Dobrynin%20Radio%20Edit%29%20%28promodj.com%29.mp3",thumb: "https://i1.sndcdn.com/artworks-000223646898-8lp8kr-t500x500.jpg"},
{trackName: "ShtelMax ", trackArtist: " Running Around (Radio Edit)", file: "http://promodj.com/download/6977771/ShtelMax%20-%20Running%20Around%20%28Radio%20Edit%29%20%28promodj.com%29.mp3",thumb: "https://i1.sndcdn.com/artworks-000223646898-8lp8kr-t500x500.jpg"},
{trackName: "Monatik ", trackArtist: " Витамин D (Vadim Adamov ft Avenso radio Edit)", file: "http://promodj.com/download/6978967/Monatik%20-%20%D0%92%D0%B8%D1%82%D0%B0%D0%BC%D0%B8%D0%BD%20D%20%28Vadim%20Adamov%20ft%20Avenso%20radio%20Edit%29%20%28promodj.com%29.mp3",thumb: "https://i1.sndcdn.com/artworks-000223646898-8lp8kr-t500x500.jpg"},
{trackName: "Mary Gu ", trackArtist: " Дисней (Nikita Lexx Remix)", file: "http://promodj.com/download/6976502/Mary%20Gu%20-%20%D0%94%D0%B8%D1%81%D0%BD%D0%B5%D0%B9%20%28Nikita%20Lexx%20Remix%29%20%28promodj.com%29.mp3",thumb: "https://i1.sndcdn.com/artworks-000223646898-8lp8kr-t500x500.jpg"},
{trackName: "Мэвл ", trackArtist: " Безумно (DJ Fazzer Radio Remix)", file: "http://promodj.com/download/6978657/%D0%9C%D1%8D%D0%B2%D0%BB%20-%20%D0%91%D0%B5%D0%B7%D1%83%D0%BC%D0%BD%D0%BE%20%28DJ%20Fazzer%20Radio%20Remix%29%20%28promodj.com%29.mp3",thumb: "https://i1.sndcdn.com/artworks-000223646898-8lp8kr-t500x500.jpg"},
{trackName: "Элджей ", trackArtist: " 360 (Avenso remix)Radio", file: "http://promodj.com/download/6978932/%D0%AD%D0%BB%D0%B4%D0%B6%D0%B5%D0%B9%20-%20360%20%28Avenso%20remix%29Radio%20%28promodj.com%29.mp3",thumb: "https://i1.sndcdn.com/artworks-000223646898-8lp8kr-t500x500.jpg"},
{trackName: "JONY ", trackArtist: " Комета (DJ Danya Voronin Remix)", file: "http://promodj.com/download/6978496/JONY%20-%20%D0%9A%D0%BE%D0%BC%D0%B5%D1%82%D0%B0%20%28DJ%20Danya%20Voronin%20Remix%29%20%28promodj.com%29.mp3",thumb: "https://i1.sndcdn.com/artworks-000223646898-8lp8kr-t500x500.jpg"},
{trackName: "Kross Well ", trackArtist: " This Moment (OUT NOW) [Neostatics Sounds]", file: "http://promodj.com/download/6978355/Kross%20Well%20-%20This%20Moment%20%28OUT%20NOW%29%20%5BNeostatics%20Sounds%5D%20%28promodj.com%29.mp3",thumb: "https://i1.sndcdn.com/artworks-000223646898-8lp8kr-t500x500.jpg"},
{trackName: "Олег Кензов ", trackArtist: " Обстановка По Кайфу  (Glazur & XM Remix)(Radio Edit)", file: "http://promodj.com/download/6978810/%D0%9E%D0%BB%D0%B5%D0%B3%20%D0%9A%D0%B5%D0%BD%D0%B7%D0%BE%D0%B2%20-%20%D0%9E%D0%B1%D1%81%D1%82%D0%B0%D0%BD%D0%BE%D0%B2%D0%BA%D0%B0%20%D0%9F%D0%BE%20%D0%9A%D0%B0%D0%B9%D1%84%D1%83%20%20%28Glazur%20%26%20XM%20Remix%29%28Radio%20Edit%29%20%28promodj.com%29.mp3",thumb: "https://i1.sndcdn.com/artworks-000223646898-8lp8kr-t500x500.jpg"},
{trackName: "Little Big ", trackArtist: " UNO (Kolya Funk & PS Project Extended Mix )", file: "http://promodj.com/download/6979054/Little%20Big%20-%20UNO%20%28Kolya%20Funk%20%26%20PS%20Project%20Extended%20Mix%20%29%20%28promodj.com%29.mp3",thumb: "https://i1.sndcdn.com/artworks-000223646898-8lp8kr-t500x500.jpg"},
{trackName: "Алеся Висич feat. Chipa ", trackArtist: " Танцуй Со Мной (Avenso remix) Radio", file: "http://promodj.com/download/6978946/%D0%90%D0%BB%D0%B5%D1%81%D1%8F%20%D0%92%D0%B8%D1%81%D0%B8%D1%87%20feat.%20Chipa%20-%20%D0%A2%D0%B0%D0%BD%D1%86%D1%83%D0%B9%20%D0%A1%D0%BE%20%D0%9C%D0%BD%D0%BE%D0%B9%20%28Avenso%20remix%29%20Radio%20%28promodj.com%29.mp3",thumb: "https://i1.sndcdn.com/artworks-000223646898-8lp8kr-t500x500.jpg"},
{trackName: "Chok ", trackArtist: " I Have to Say (Bezumno Remix)", file: "http://promodj.com/download/6977963/Chok%20-%20I%20Have%20to%20Say%20%28Bezumno%20Remix%29%20%28promodj.com%29.mp3",thumb: "https://i1.sndcdn.com/artworks-000223646898-8lp8kr-t500x500.jpg"},
{trackName: "Papin", trackArtist: "Magic of love(original 2k20)", file: "http://promodj.com/download/6978853/Papin-Magic%20of%20love%28original%202k20%29%20%28promodj.com%29.mp3",thumb: "https://i1.sndcdn.com/artworks-000223646898-8lp8kr-t500x500.jpg"},
{trackName: "Артём Качер ", trackArtist: " Яд (Vadim Adamov ft Avenso Radio Edit)", file: "http://promodj.com/download/6978944/%D0%90%D1%80%D1%82%D1%91%D0%BC%20%D0%9A%D0%B0%D1%87%D0%B5%D1%80%20-%20%D0%AF%D0%B4%20%28Vadim%20Adamov%20ft%20Avenso%20Radio%20Edit%29%20%28promodj.com%29.mp3",thumb: "https://i1.sndcdn.com/artworks-000223646898-8lp8kr-t500x500.jpg"},
{trackName: "Kambulat ", trackArtist: " Мой кайф (Bizzba Remix)", file: "http://promodj.com/download/6979094/Kambulat%20-%20%D0%9C%D0%BE%D0%B9%20%D0%BA%D0%B0%D0%B9%D1%84%20%28Bizzba%20Remix%29%20%28promodj.com%29.mp3",thumb: "https://i1.sndcdn.com/artworks-000223646898-8lp8kr-t500x500.jpg"},
{trackName: "dikii trip ", trackArtist: " Lizergin", file: "http://promodj.com/download/6975992/dikii%20trip%20-%20Lizergin%20%28promodj.com%29.mp3",thumb: "https://i1.sndcdn.com/artworks-000223646898-8lp8kr-t500x500.jpg"},
{trackName: "Анна Седокова ", trackArtist: " Увлечение (Vadim Adamov ft Avenso Radio Edit)", file: "http://promodj.com/download/6978945/%D0%90%D0%BD%D0%BD%D0%B0%20%D0%A1%D0%B5%D0%B4%D0%BE%D0%BA%D0%BE%D0%B2%D0%B0%20-%20%D0%A3%D0%B2%D0%BB%D0%B5%D1%87%D0%B5%D0%BD%D0%B8%D0%B5%20%28Vadim%20Adamov%20ft%20Avenso%20Radio%20Edit%29%20%28promodj.com%29.mp3",thumb: "https://i1.sndcdn.com/artworks-000223646898-8lp8kr-t500x500.jpg"},
{trackName: "Kim ", trackArtist: " Pub (Glazur & XM Remix)(Radio Edit)", file: "http://promodj.com/download/6979042/Kim%20-%20Pub%20%28Glazur%20%26%20XM%20Remix%29%28Radio%20Edit%29%20%28promodj.com%29.mp3",thumb: "https://i1.sndcdn.com/artworks-000223646898-8lp8kr-t500x500.jpg"},
{trackName: "AUX ", trackArtist: " Shes gone (original mix)", file: "http://promodj.com/download/6978203/AUX%20-%20Shes%20gone%20%28original%20mix%29%20%28promodj.com%29.mp3",thumb: "https://i1.sndcdn.com/artworks-000223646898-8lp8kr-t500x500.jpg"},
{trackName: "Мэвл ", trackArtist: " Безумно (DJ Fazzer Radio Remix)", file: "http://promodj.com/download/6978657/%D0%9C%D1%8D%D0%B2%D0%BB%20-%20%D0%91%D0%B5%D0%B7%D1%83%D0%BC%D0%BD%D0%BE%20%28DJ%20Fazzer%20Radio%20Remix%29%20%28promodj.com%29.mp3",thumb: "https://i1.sndcdn.com/artworks-000223646898-8lp8kr-t500x500.jpg"},
{trackName: "SHiNE ", trackArtist: " Miami Deja Vu (Komodo & Sykes)", file: "http://promodj.com/download/6977448/SHiNE%20-%20Miami%20Deja%20Vu%20%28Komodo%20%26%20Sykes%29%20%28promodj.com%29.mp3",thumb: "https://i1.sndcdn.com/artworks-000223646898-8lp8kr-t500x500.jpg"},
{trackName: "Alok feat. Bruno Martini .Zeeba ", trackArtist: " Never Let Me Go ( Avenso radio edit)", file: "http://promodj.com/download/6978918/Alok%20feat.%20Bruno%20Martini%20.Zeeba%20-%20Never%20Let%20Me%20Go%20%28%20Avenso%20radio%20edit%29%20%28promodj.com%29.mp3",thumb: "https://i1.sndcdn.com/artworks-000223646898-8lp8kr-t500x500.jpg"},
{trackName: "Nebezao, Андрей Леницкий ", trackArtist: " Целуешь, прощаешь (D. Anuchin Radio Edit)", file: "http://promodj.com/download/6979025/Nebezao%2C%20%D0%90%D0%BD%D0%B4%D1%80%D0%B5%D0%B9%20%D0%9B%D0%B5%D0%BD%D0%B8%D1%86%D0%BA%D0%B8%D0%B9%20-%20%D0%A6%D0%B5%D0%BB%D1%83%D0%B5%D1%88%D1%8C%2C%20%D0%BF%D1%80%D0%BE%D1%89%D0%B0%D0%B5%D1%88%D1%8C%20%28D.%20Anuchin%20Radio%20Edit%29%20%28promodj.com%29.mp3",thumb: "https://i1.sndcdn.com/artworks-000223646898-8lp8kr-t500x500.jpg"},
{trackName: "Pink Disco Robot ", trackArtist: " Fading (AlecSun Remix)", file: "http://promodj.com/download/6978030/Pink%20Disco%20Robot%20-%20Fading%20%28AlecSun%20Remix%29%20%28promodj.com%29.mp3",thumb: "https://i1.sndcdn.com/artworks-000223646898-8lp8kr-t500x500.jpg"},
{trackName: "Ace Of Base ", trackArtist: " The Sign (Dj.Polattt ReMix)", file: "http://promodj.com/download/6976723/Ace%20Of%20Base%20-%20The%20Sign%20%28Dj.Polattt%20ReMix%29%20%28promodj.com%29.mp3",thumb: "https://i1.sndcdn.com/artworks-000223646898-8lp8kr-t500x500.jpg"},
{trackName: "Celebra ", trackArtist: " Паранойя", file: "http://promodj.com/download/6978317/Celebra%20-%20%D0%9F%D0%B0%D1%80%D0%B0%D0%BD%D0%BE%D0%B9%D1%8F%20%28promodj.com%29.mp3",thumb: "https://i1.sndcdn.com/artworks-000223646898-8lp8kr-t500x500.jpg"},
{trackName: "Chok ", trackArtist: " I Have To Say (Eddie G Radio Remix)", file: "http://promodj.com/download/6976456/Chok%20-%20I%20Have%20To%20Say%20%28Eddie%20G%20Radio%20Remix%29%20%28promodj.com%29.mp3",thumb: "https://i1.sndcdn.com/artworks-000223646898-8lp8kr-t500x500.jpg"},
{trackName: "DJ.M ft. Carla's Dreams ", trackArtist: " Треугольники (DJ.M Remix)", file: "http://promodj.com/download/6977797/DJ.M%20ft.%20Carla%27s%20Dreams%20-%20%D0%A2%D1%80%D0%B5%D1%83%D0%B3%D0%BE%D0%BB%D1%8C%D0%BD%D0%B8%D0%BA%D0%B8%20%28DJ.M%20Remix%29%20%28promodj.com%29.mp3",thumb: "https://i1.sndcdn.com/artworks-000223646898-8lp8kr-t500x500.jpg"},
{trackName: "Артем Качер & TARAS ", trackArtist: " Давай забудем (Vincent & Diaz Remix)", file: "http://promodj.com/download/6976974/%D0%90%D1%80%D1%82%D0%B5%D0%BC%20%D0%9A%D0%B0%D1%87%D0%B5%D1%80%20%26%20TARAS%20-%20%D0%94%D0%B0%D0%B2%D0%B0%D0%B8%CC%86%20%D0%B7%D0%B0%D0%B1%D1%83%D0%B4%D0%B5%D0%BC%20%28Vincent%20%26%20Diaz%20Remix%29%20%28promodj.com%29.mp3",thumb: "https://i1.sndcdn.com/artworks-000223646898-8lp8kr-t500x500.jpg"},
{trackName: "Kambulat ", trackArtist: " Мой кайф (Bizzba Remix)", file: "http://promodj.com/download/6979094/Kambulat%20-%20%D0%9C%D0%BE%D0%B9%20%D0%BA%D0%B0%D0%B9%D1%84%20%28Bizzba%20Remix%29%20%28promodj.com%29.mp3",thumb: "https://i1.sndcdn.com/artworks-000223646898-8lp8kr-t500x500.jpg"},
{trackName: "Катя Чехова ", trackArtist: " В клубе погасли огни(Sergey Zevs remix)", file: "http://promodj.com/download/6978223/%D0%9A%D0%B0%D1%82%D1%8F%20%D0%A7%D0%B5%D1%85%D0%BE%D0%B2%D0%B0%20-%20%D0%92%20%D0%BA%D0%BB%D1%83%D0%B1%D0%B5%20%D0%BF%D0%BE%D0%B3%D0%B0%D1%81%D0%BB%D0%B8%20%D0%BE%D0%B3%D0%BD%D0%B8%28Sergey%20Zevs%20remix%29%20%28promodj.com%29.mp3",thumb: "https://i1.sndcdn.com/artworks-000223646898-8lp8kr-t500x500.jpg"},
{trackName: "Chok ", trackArtist: " I have to say (Konstantin Vinogradov remix)", file: "http://promodj.com/download/6977883/Chok%20-%20I%20have%20to%20say%20%28Konstantin%20Vinogradov%20remix%29%20%28promodj.com%29.mp3",thumb: "https://i1.sndcdn.com/artworks-000223646898-8lp8kr-t500x500.jpg"},
{trackName: "Юлианна Караулова ", trackArtist: " Не верю (Vadim Adamov ft. Avenso remix)", file: "http://promodj.com/download/6978929/%D0%AE%D0%BB%D0%B8%D0%B0%D0%BD%D0%BD%D0%B0%20%D0%9A%D0%B0%D1%80%D0%B0%D1%83%D0%BB%D0%BE%D0%B2%D0%B0%20-%20%D0%9D%D0%B5%20%D0%B2%D0%B5%D1%80%D1%8E%20%28Vadim%20Adamov%20ft.%20Avenso%20remix%29%20%28promodj.com%29.mp3",thumb: "https://i1.sndcdn.com/artworks-000223646898-8lp8kr-t500x500.jpg"},
{trackName: "LMNTRX, SOROUSH YARAHMADI & Flamers ", trackArtist: " Jam(Kacper Bootleg)[2020]", file: "http://promodj.com/download/6978839/LMNTRX%2C%20SOROUSH%20YARAHMADI%20%26%20Flamers%20-%20Jam%28Kacper%20Bootleg%29%5B2020%5D%20%28promodj.com%29.mp3",thumb: "https://i1.sndcdn.com/artworks-000223646898-8lp8kr-t500x500.jpg"},
{trackName: "Monkist ", trackArtist: " Annunaki (Original mix)", file: "http://promodj.com/download/6978383/Monkist%20-%20Annunaki%20%28Original%20mix%29%20%28promodj.com%29.mp3",thumb: "https://i1.sndcdn.com/artworks-000223646898-8lp8kr-t500x500.jpg"},
{trackName: "G & J ", trackArtist: " What You Want (Original Mix)", file: "http://promodj.com/download/6978688/G%20%26%20J%20-%20What%20You%20Want%20%28Original%20Mix%29%20%28promodj.com%29.mp3",thumb: "https://i1.sndcdn.com/artworks-000223646898-8lp8kr-t500x500.jpg"},
{trackName: "На на ", trackArtist: " Фаина (AntiPust remix)", file: "http://promodj.com/download/6978508/%D0%9D%D0%B0%20%D0%BD%D0%B0%20-%20%D0%A4%D0%B0%D0%B8%D0%BD%D0%B0%20%28AntiPust%20remix%29%20%28promodj.com%29.mp3",thumb: "https://i1.sndcdn.com/artworks-000223646898-8lp8kr-t500x500.jpg"},
{trackName: "Sound Of Legend ", trackArtist: " Sweet Dreams (Mixon Spencer & Butesha Remix)", file: "http://promodj.com/download/6978502/Sound%20Of%20Legend%20-%20Sweet%20Dreams%20%28Mixon%20Spencer%20%26%20Butesha%20Remix%29%20%28promodj.com%29.mp3",thumb: "https://i1.sndcdn.com/artworks-000223646898-8lp8kr-t500x500.jpg"},
{trackName: "Killahroom ", trackArtist: " Забери меня с собой на луну", file: "http://promodj.com/download/6976079/Killahroom%20-%20%D0%97%D0%B0%D0%B1%D0%B5%D1%80%D0%B8%20%D0%BC%D0%B5%D0%BD%D1%8F%20%D1%81%20%D1%81%D0%BE%D0%B1%D0%BE%D0%B9%20%D0%BD%D0%B0%20%D0%BB%D1%83%D0%BD%D1%83%20%28promodj.com%29.mp3",thumb: "https://i1.sndcdn.com/artworks-000223646898-8lp8kr-t500x500.jpg"},
{trackName: "Apache 207 ", trackArtist: " Roller (Rakurs & JayCox Remix)", file: "http://promodj.com/download/6978864/Apache%20207%20-%20Roller%20%28Rakurs%20%26%20JayCox%20Remix%29%20%28promodj.com%29.mp3",thumb: "https://i1.sndcdn.com/artworks-000223646898-8lp8kr-t500x500.jpg"},
{trackName: "ВАСИЛЬЕВ. В. В. ", trackArtist: " МАЛЕЦ", file: "http://promodj.com/download/6978352/%D0%92%D0%90%D0%A1%D0%98%D0%9B%D0%AC%D0%95%D0%92.%20%D0%92.%20%D0%92.%20-%20%D0%9C%D0%90%D0%9B%D0%95%D0%A6%20%28promodj.com%29.mp3",thumb: "https://i1.sndcdn.com/artworks-000223646898-8lp8kr-t500x500.jpg"},
{trackName: "Jony ", trackArtist: " Френдзона (Dj Mephisto & Dj Demon Remix)", file: "http://promodj.com/download/6976479/Jony%20-%20%D0%A4%D1%80%D0%B5%D0%BD%D0%B4%D0%B7%D0%BE%D0%BD%D0%B0%20%28Dj%20Mephisto%20%26%20Dj%20Demon%20Remix%29%20%28promodj.com%29.mp3",thumb: "https://i1.sndcdn.com/artworks-000223646898-8lp8kr-t500x500.jpg"},
    ]
  }

  $(".jAudio").jAudio(t);

})();
