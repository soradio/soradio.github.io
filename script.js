!function(t){function i(i,a){this.settings=t.extend(!0,e,a),this.$context=i,this.domAudio=this.$context.find("audio")[0],this.$domPlaylist=this.$context.find(".jAudio--playlist"),this.$domControls=this.$context.find(".jAudio--controls"),this.$domVolumeBar=this.$context.find(".jAudio--volume"),this.$domDetails=this.$context.find(".jAudio--details"),this.$domStatusBar=this.$context.find(".jAudio--status-bar"),this.$domProgressBar=this.$context.find(".jAudio--progress-bar-wrapper"),this.$domTime=this.$context.find(".jAudio--time"),this.$domElapsedTime=this.$context.find(".jAudio--time-elapsed"),this.$domTotalTime=this.$context.find(".jAudio--time-total"),this.$domThumb=this.$context.find(".jAudio--thumb"),this.currentState="pause",this.currentTrack=this.settings.defaultTrack,this.currentElapsedTime=void 0,this.timer=void 0,this.init()}var a="jAudio",e={playlist:[],defaultAlbum:void 0,defaultArtist:void 0,defaultTrack:0,autoPlay:!1,debug:!1};i.prototype={init:function(){var t=this;t.renderPlaylist(),t.preLoadTrack(),t.highlightTrack(),t.updateTotalTime(),t.events(),t.debug(),t.domAudio.volume=.05},play:function(t){var i=this;i.domAudio.play(),"play"!==i.currentState&&(clearInterval(i.timer),i.timer=setInterval(i.run.bind(i),50),i.currentState="play",t.data("action","pause"),t.removeClass("jAudio--control-play"),t.addClass("jAudio--control-pause"),t.toggleClass("active"))},pause:function(t){var i=this;i.domAudio.pause(),clearInterval(i.timer),i.currentState="pause",t.data("action","play"),t.removeClass("jAudio--control-pause"),t.addClass("jAudio--control-play"),t.toggleClass("active")},stop:function(){var t=this;t.domAudio.pause(),t.domAudio.currentTime=0,t.animateProgressBarPosition(),clearInterval(t.timer),t.updateElapsedTime(),t.currentState="stop"},prev:function(){var t,i=this;t=0===i.currentTrack?i.settings.playlist.length-1:i.currentTrack-1,i.changeTrack(t)},next:function(){var t,i=this;t=i.currentTrack===i.settings.playlist.length-1?0:i.currentTrack+1,i.changeTrack(t)},preLoadTrack:function(){var t=this,i=t.settings.defaultTrack;t.changeTrack(i),t.stop()},changeTrack:function(t){var i=this;i.currentTrack=t,i.domAudio.src=i.settings.playlist[t].file,("play"===i.currentState||i.settings.autoPlay)&&i.play(),i.highlightTrack(),i.updateThumb(),i.renderDetails()},events:function(){var i=this;i.$domControls.on("click",".jAudio--control",function(){var a=t(this),e=a.data("action");switch(e){case"prev":i.prev.call(i,a);break;case"next":i.next.call(i,a);break;case"pause":i.pause.call(i,a);break;case"stop":i.stop.call(i,a);break;case"play":i.play.call(i,a)}}),i.$domPlaylist.on("click",".jAudio--playlist-item",function(){var a=t(this),e=(a.data("track"),a.index());i.currentTrack!==e&&i.changeTrack(e)}),i.$domProgressBar.on("click",function(t){i.updateProgressBar(t),i.updateElapsedTime()}),t(i.domAudio).on("loadedmetadata",function(){i.animateProgressBarPosition.call(i),i.updateElapsedTime.call(i),i.updateTotalTime.call(i)})},getAudioSeconds:function(t){var i=this,t=t%60;return t=i.addZero(Math.floor(t),2),t=60>t?t:"00"},getAudioMinutes:function(t){var i=this,t=t/60;return t=i.addZero(Math.floor(t),2),t=60>t?t:"00"},addZero:function(t,i){for(var t=String(t);t.length<i;)t="0"+t;return t},removeZero:function(t,i){for(var t=String(t),a=0;i>a&&"0"===t[0];)t=t.substr(1,t.length),a++;return t},highlightTrack:function(){var t=this,i=t.$domPlaylist.children(),a="active";i.removeClass(a),i.eq(t.currentTrack).addClass(a)},renderDetails:function(){var t=this,i=t.settings.playlist[t.currentTrack],a=(i.file,i.thumb,i.trackName),e=i.trackArtist,r=(i.trackAlbum,"");r+="<p>",r+="<span>"+a+"</span>",r+="<span>"+e+"</span>",r+="</p>",t.$domDetails.html(r)},renderPlaylist:function(){var i=this,a="";t.each(i.settings.playlist,function(t,i){{var e=i.file,r=i.thumb,o=i.trackName,s=i.trackArtist;i.trackAlbum}trackDuration="00:00",a+="<div class='jAudio--playlist-item' data-track='"+e+"'>",a+="<div class='jAudio--playlist-thumb'><img src='"+r+"'></div>",a+="<div class='jAudio--playlist-meta'>",a+="<p class='jAudio--playlist-meta-track-name'>"+o+"</p>",a+="<p class='jAudio--playlist-meta-track-artist'>"+s+"</p>",a+="</div>",a+="</div>"}),i.$domPlaylist.html(a)},run:function(){var t=this;t.animateProgressBarPosition(),t.updateElapsedTime(),t.domAudio.ended&&t.next()},animateProgressBarPosition:function(){var t=this,i=100*t.domAudio.currentTime/t.domAudio.duration+"%",a={width:i};t.$domProgressBar.children().eq(0).css(a)},updateProgressBar:function(t){var i,a,e,r=this;t.offsetX&&(i=t.offsetX),void 0===i&&t.layerX&&(i=t.layerX),a=i/r.$domProgressBar.width(),e=r.domAudio.duration*a,r.domAudio.currentTime=e,r.animateProgressBarPosition()},updateElapsedTime:function(){var t=this,i=t.domAudio.currentTime,a=t.getAudioMinutes(i),e=t.getAudioSeconds(i),r=a+":"+e;t.$domElapsedTime.text(r)},updateTotalTime:function(){var t=this,i=t.domAudio.duration,a=t.getAudioMinutes(i),e=t.getAudioSeconds(i),r=a+":"+e;t.$domTotalTime.text(r)},updateThumb:function(){var t=this,i=t.settings.playlist[t.currentTrack].thumb,a={"background-image":"url("+i+")"};t.$domThumb.css(a)},debug:function(){var t=this;t.settings.debug&&console.log(t.settings)}},t.fn[a]=function(a){var e=function(){return new i(t(this),a)};t(this).each(e)}}(jQuery);

(function(){
  var t = {
    playlist: [
{trackName: "GAYAZOV$ BROTHER$ ", trackArtist: "  ХЕДШОТ (Dj Sasha White Remix)", file: "http://promodj.com/download/6979480/GAYAZOV%24%20BROTHER%24%20-%20%20%D0%A5%D0%95%D0%94%D0%A8%D0%9E%D0%A2%20%28Dj%20Sasha%20White%20Remix%29%20%28promodj.com%29.mp3", thumb: "https://i1.sndcdn.com/artworks-000223646898-8lp8kr-t500x500.jpg"},
{trackName: "GAYAZOV$ BROTHER$ ", trackArtist: "  ХЕДШОТ (Dj Sasha White Radio Edit)", file: "http://promodj.com/download/6979473/GAYAZOV%24%20BROTHER%24%20-%20%20%D0%A5%D0%95%D0%94%D0%A8%D0%9E%D0%A2%20%28Dj%20Sasha%20White%20Radio%20Edit%29%20%28promodj.com%29.mp3", thumb: "https://i1.sndcdn.com/artworks-000223646898-8lp8kr-t500x500.jpg"},
{trackName: "Анна Филипчук – Любовь", trackArtist: "война (Ayn D Remix)", file: "http://promodj.com/download/6979463/%D0%90%D0%BD%D0%BD%D0%B0%20%D0%A4%D0%B8%D0%BB%D0%B8%D0%BF%D1%87%D1%83%D0%BA%20%E2%80%93%20%D0%9B%D1%8E%D0%B1%D0%BE%D0%B2%D1%8C-%D0%B2%D0%BE%D0%B9%D0%BD%D0%B0%20%28Ayn%20D%20Remix%29%20%28promodj.com%29.mp3", thumb: "https://i1.sndcdn.com/artworks-000223646898-8lp8kr-t500x500.jpg"},
{trackName: "Gidayyat, Gazan x Rakurs ", trackArtist: " КОРОНАМИНУС ( Dj SneiF Mash Up )", file: "http://promodj.com/download/6979379/Gidayyat%2C%20Gazan%20x%20Rakurs%20-%20%D0%9A%D0%9E%D0%A0%D0%9E%D0%9D%D0%90%D0%9C%D0%98%D0%9D%D0%A3%D0%A1%20%28%20Dj%20SneiF%20Mash%20Up%20%29%20%28promodj.com%29.mp3", thumb: "https://i1.sndcdn.com/artworks-000223646898-8lp8kr-t500x500.jpg"},
{trackName: "KARTASHOW ", trackArtist: " Карантин (Bardrop Radio Edit)", file: "http://promodj.com/download/6979377/KARTASHOW%20-%20%D0%9A%D0%B0%D1%80%D0%B0%D0%BD%D1%82%D0%B8%D0%BD%20%28Bardrop%20Radio%20Edit%29%20%28promodj.com%29.mp3", thumb: "https://i1.sndcdn.com/artworks-000223646898-8lp8kr-t500x500.jpg"},
{trackName: "Chok ", trackArtist: " I  Have To Say (Bow Remix)", file: "http://promodj.com/download/6979303/Chok%20-%20I%20%20Have%20To%20Say%20%28Bow%20Remix%29%20%28promodj.com%29.mp3", thumb: "https://i1.sndcdn.com/artworks-000223646898-8lp8kr-t500x500.jpg"},
{trackName: "Roman Petrov ", trackArtist: " The Barber of Your Heart (Olga TiZi Remix V3)", file: "http://promodj.com/download/6979263/Roman%20Petrov%20-%20The%20Barber%20of%20Your%20Heart%20%28Olga%20TiZi%20Remix%20V3%29%20%28promodj.com%29.mp3", thumb: "https://i1.sndcdn.com/artworks-000223646898-8lp8kr-t500x500.jpg"},
{trackName: "Roman Petrov ", trackArtist: " The Barber of Your Heart (Maxim Keks & FuZzee Remix)", file: "http://promodj.com/download/6979254/Roman%20Petrov%20-%20The%20Barber%20of%20Your%20Heart%20%28Maxim%20Keks%20%26%20FuZzee%20Remix%29%20%28promodj.com%29.mp3", thumb: "https://i1.sndcdn.com/artworks-000223646898-8lp8kr-t500x500.jpg"},
{trackName: "Roman Petrov ", trackArtist: " The Barber of Your Heart (Maxim Keks & FuZzee Remix)", file: "http://promodj.com/download/6979242/Roman%20Petrov%20-%20The%20Barber%20of%20Your%20Heart%20%28Maxim%20Keks%20%26%20FuZzee%20Remix%29%20%28promodj.com%29.mp3", thumb: "https://i1.sndcdn.com/artworks-000223646898-8lp8kr-t500x500.jpg"},
{trackName: "Roman Petrov ", trackArtist: " The barber of your heart (Veyya Remix V2)", file: "http://promodj.com/download/6979231/Roman%20Petrov%20-%20The%20barber%20of%20your%20heart%20%28Veyya%20Remix%20V2%29%20%28promodj.com%29.mp3", thumb: "https://i1.sndcdn.com/artworks-000223646898-8lp8kr-t500x500.jpg"},
{trackName: "ДЛБ ", trackArtist: " Чёрные Кальяны (Glazur & XM Remix)", file: "http://promodj.com/download/6979217/%D0%94%D0%9B%D0%91%20-%20%D0%A7%D1%91%D1%80%D0%BD%D1%8B%D0%B5%20%D0%9A%D0%B0%D0%BB%D1%8C%D1%8F%D0%BD%D1%8B%20%28Glazur%20%26%20XM%20Remix%29%20%28promodj.com%29.mp3", thumb: "https://i1.sndcdn.com/artworks-000223646898-8lp8kr-t500x500.jpg"},
{trackName: "Галаксея ", trackArtist: " не проси (feat.Alisher)", file: "http://promodj.com/download/6979038/%D0%93%D0%B0%D0%BB%D0%B0%D0%BA%D1%81%D0%B5%D1%8F%20-%20%D0%BD%D0%B5%20%D0%BF%D1%80%D0%BE%D1%81%D0%B8%20%28feat.Alisher%29%20%28promodj.com%29.mp3", thumb: "https://i1.sndcdn.com/artworks-000223646898-8lp8kr-t500x500.jpg"},
{trackName: "Dima Isay ", trackArtist: " Love (Original Mix)", file: "http://promodj.com/download/6979439/Dima%20Isay%20-%20Love%20%28Original%20Mix%29%20%28promodj.com%29.mp3", thumb: "https://i1.sndcdn.com/artworks-000223646898-8lp8kr-t500x500.jpg"},
{trackName: "Eli & Fur ", trackArtist: " You're So High (VoJo Radio Edit)", file: "http://promodj.com/download/6979423/Eli%20%26%20Fur%20-%20You%27re%20So%20High%20%28VoJo%20Radio%20Edit%29%20%28promodj.com%29.mp3", thumb: "https://i1.sndcdn.com/artworks-000223646898-8lp8kr-t500x500.jpg"},
{trackName: "Deepend feat. She Keeps Bees ", trackArtist: " Desire (XSerDJ Remix)", file: "http://promodj.com/download/6979390/Deepend%20feat.%20She%20Keeps%20Bees%20-%20Desire%20%28XSerDJ%20Remix%29%20%28promodj.com%29.mp3", thumb: "https://i1.sndcdn.com/artworks-000223646898-8lp8kr-t500x500.jpg"},
{trackName: "KARTASHOW ", trackArtist: " Карантин (Bardrop Radio Edit)", file: "http://promodj.com/download/6979377/KARTASHOW%20-%20%D0%9A%D0%B0%D1%80%D0%B0%D0%BD%D1%82%D0%B8%D0%BD%20%28Bardrop%20Radio%20Edit%29%20%28promodj.com%29.mp3", thumb: "https://i1.sndcdn.com/artworks-000223646898-8lp8kr-t500x500.jpg"},
{trackName: "Untimed ", trackArtist: " Sounds of sunshine (edit)", file: "http://promodj.com/download/6979364/Untimed%20-%20Sounds%20of%20sunshine%20%28edit%29%20%28promodj.com%29.mp3", thumb: "https://i1.sndcdn.com/artworks-000223646898-8lp8kr-t500x500.jpg"},
{trackName: "Chok ", trackArtist: " I  Have To Say (Maraqua Remix 2)", file: "http://promodj.com/download/6979326/Chok%20-%20I%20%20Have%20To%20Say%20%28Maraqua%20Remix%202%29%20%28promodj.com%29.mp3", thumb: "https://i1.sndcdn.com/artworks-000223646898-8lp8kr-t500x500.jpg"},
{trackName: "BinGo ", trackArtist: " Noise (Original Mix)", file: "http://promodj.com/download/6979323/BinGo%20-%20Noise%20%28Original%20Mix%29%20%28promodj.com%29.mp3", thumb: "https://i1.sndcdn.com/artworks-000223646898-8lp8kr-t500x500.jpg"},
{trackName: "Chok ", trackArtist: " I Have To Say (XF Remix)", file: "http://promodj.com/download/6979322/Chok%20-%20I%20Have%20To%20Say%20%28XF%20Remix%29%20%28promodj.com%29.mp3", thumb: "https://i1.sndcdn.com/artworks-000223646898-8lp8kr-t500x500.jpg"},
{trackName: "Chok ", trackArtist: " I Have to Say (Bezumno Remix)", file: "http://promodj.com/download/6979297/Chok%20-%20I%20Have%20to%20Say%20%28Bezumno%20Remix%29%20%28promodj.com%29.mp3", thumb: "https://i1.sndcdn.com/artworks-000223646898-8lp8kr-t500x500.jpg"},
{trackName: "Анна Тринчер ", trackArtist: " Короче, Понятно (BONDAR DJ REMIX 2020 )", file: "http://promodj.com/download/6979294/%D0%90%D0%BD%D0%BD%D0%B0%20%D0%A2%D1%80%D0%B8%D0%BD%D1%87%D0%B5%D1%80%20-%20%D0%9A%D0%BE%D1%80%D0%BE%D1%87%D0%B5%2C%20%D0%9F%D0%BE%D0%BD%D1%8F%D1%82%D0%BD%D0%BE%20%28BONDAR%20DJ%20REMIX%202020%20%29%20%28promodj.com%29.mp3", thumb: "https://i1.sndcdn.com/artworks-000223646898-8lp8kr-t500x500.jpg"},
{trackName: "ДОЛЯ ", trackArtist: " КРИЛА (DJ Karimov & DJ Mephisto Remix)", file: "http://promodj.com/download/6979498/%D0%94%D0%9E%D0%9B%D0%AF%20-%20%D0%9A%D0%A0%D0%98%D0%9B%D0%90%20%28DJ%20Karimov%20%26%20DJ%20Mephisto%20Remix%29%20%28promodj.com%29.mp3", thumb: "https://i1.sndcdn.com/artworks-000223646898-8lp8kr-t500x500.jpg"},
{trackName: "ДОЛЯ ", trackArtist: " КРИЛА (DJ Karimov & DJ Mephisto Radio Remix)", file: "http://promodj.com/download/6979497/%D0%94%D0%9E%D0%9B%D0%AF%20-%20%D0%9A%D0%A0%D0%98%D0%9B%D0%90%20%28DJ%20Karimov%20%26%20DJ%20Mephisto%20Radio%20Remix%29%20%28promodj.com%29.mp3", thumb: "https://i1.sndcdn.com/artworks-000223646898-8lp8kr-t500x500.jpg"},
{trackName: "GAYAZOV$ BROTHER$ ", trackArtist: "  ХЕДШОТ (Dj Sasha White Remix)", file: "http://promodj.com/download/6979480/GAYAZOV%24%20BROTHER%24%20-%20%20%D0%A5%D0%95%D0%94%D0%A8%D0%9E%D0%A2%20%28Dj%20Sasha%20White%20Remix%29%20%28promodj.com%29.mp3", thumb: "https://i1.sndcdn.com/artworks-000223646898-8lp8kr-t500x500.jpg"},
{trackName: "GAYAZOV$ BROTHER$ ", trackArtist: "  ХЕДШОТ (Dj Sasha White Radio Edit)", file: "http://promodj.com/download/6979473/GAYAZOV%24%20BROTHER%24%20-%20%20%D0%A5%D0%95%D0%94%D0%A8%D0%9E%D0%A2%20%28Dj%20Sasha%20White%20Radio%20Edit%29%20%28promodj.com%29.mp3", thumb: "https://i1.sndcdn.com/artworks-000223646898-8lp8kr-t500x500.jpg"},
{trackName: "Tom & Jame, Cacciola feat. Milk Bar ", trackArtist: " New world body (DJ Legenda VIP edit)", file: "http://promodj.com/download/6979466/Tom%20%26%20Jame%2C%20Cacciola%20feat.%20Milk%20Bar%20-%20New%20world%20body%20%28DJ%20Legenda%20VIP%20edit%29%20%28promodj.com%29.mp3", thumb: "https://i1.sndcdn.com/artworks-000223646898-8lp8kr-t500x500.jpg"},
{trackName: "Dima Isay ", trackArtist: " Love (Original Mix)", file: "http://promodj.com/download/6979439/Dima%20Isay%20-%20Love%20%28Original%20Mix%29%20%28promodj.com%29.mp3", thumb: "https://i1.sndcdn.com/artworks-000223646898-8lp8kr-t500x500.jpg"},
{trackName: "Montesuma&Manula ", trackArtist: " Между Телами (Leo Burn & Kolya Dark Radio Edit)", file: "http://promodj.com/download/6979436/Montesuma%26Manula%20-%20%D0%9C%D0%B5%D0%B6%D0%B4%D1%83%20%D0%A2%D0%B5%D0%BB%D0%B0%D0%BC%D0%B8%20%28Leo%20Burn%20%26%20Kolya%20Dark%20Radio%20Edit%29%20%28promodj.com%29.mp3", thumb: "https://i1.sndcdn.com/artworks-000223646898-8lp8kr-t500x500.jpg"},
{trackName: "CYGO ", trackArtist: " Panda E (Dobrynin Radio Edit)", file: "http://promodj.com/download/6979435/CYGO%20-%20Panda%20E%20%28Dobrynin%20Radio%20Edit%29%20%28promodj.com%29.mp3", thumb: "https://i1.sndcdn.com/artworks-000223646898-8lp8kr-t500x500.jpg"},
{trackName: "Kaoma ", trackArtist: " Lambada (Scorpio & Scrooge Reboot)", file: "http://promodj.com/download/6979434/Kaoma%20-%20Lambada%20%28Scorpio%20%26%20Scrooge%20Reboot%29%20%28promodj.com%29.mp3", thumb: "https://i1.sndcdn.com/artworks-000223646898-8lp8kr-t500x500.jpg"},
{trackName: "Smash feat. Артём Пивоваров ", trackArtist: " Сохрани (Alex Shik Radio Edit)", file: "http://promodj.com/download/6979433/Smash%20feat.%20%D0%90%D1%80%D1%82%D1%91%D0%BC%20%D0%9F%D0%B8%D0%B2%D0%BE%D0%B2%D0%B0%D1%80%D0%BE%D0%B2%20-%20%D0%A1%D0%BE%D1%85%D1%80%D0%B0%D0%BD%D0%B8%20%28Alex%20Shik%20Radio%20Edit%29%20%28promodj.com%29.mp3", thumb: "https://i1.sndcdn.com/artworks-000223646898-8lp8kr-t500x500.jpg"},
{trackName: "DJ Antoine & The Beat Shakers Ft. Trauffer ", trackArtist: " Ma Cherie (DJ Ad!k 2020 Booty Mix)", file: "http://promodj.com/download/6979383/DJ%20Antoine%20%26%20The%20Beat%20Shakers%20Ft.%20Trauffer%20-%20Ma%20Cherie%20%28DJ%20Ad%21k%202020%20Booty%20Mix%29%20%28promodj.com%29.mp3", thumb: "https://i1.sndcdn.com/artworks-000223646898-8lp8kr-t500x500.jpg"},
{trackName: "Gidayyat, Gazan x Rakurs ", trackArtist: " КОРОНАМИНУС ( Dj SneiF Mash Up )", file: "http://promodj.com/download/6979379/Gidayyat%2C%20Gazan%20x%20Rakurs%20-%20%D0%9A%D0%9E%D0%A0%D0%9E%D0%9D%D0%90%D0%9C%D0%98%D0%9D%D0%A3%D0%A1%20%28%20Dj%20SneiF%20Mash%20Up%20%29%20%28promodj.com%29.mp3", thumb: "https://i1.sndcdn.com/artworks-000223646898-8lp8kr-t500x500.jpg"},
{trackName: "Dj INVITED,Jennifer Lopez & Pitbull х Jean Elan,Kamaliya ", trackArtist: " Кабриолет On The Butterflies (KLUBBTON Mash Up)", file: "http://promodj.com/download/6979325/Dj%20INVITED%2CJennifer%20Lopez%20%26%20Pitbull%20%D1%85%20Jean%20Elan%2CKamaliya%20-%20%D0%9A%D0%B0%D0%B1%D1%80%D0%B8%D0%BE%D0%BB%D0%B5%D1%82%20On%20The%20Butterflies%20%28KLUBBTON%20Mash%20Up%29%20%28promodj.com%29.mp3", thumb: "https://i1.sndcdn.com/artworks-000223646898-8lp8kr-t500x500.jpg"},
{trackName: "Chok ", trackArtist: " I Have To Say (XF Remix)", file: "http://promodj.com/download/6979322/Chok%20-%20I%20Have%20To%20Say%20%28XF%20Remix%29%20%28promodj.com%29.mp3", thumb: "https://i1.sndcdn.com/artworks-000223646898-8lp8kr-t500x500.jpg"},
{trackName: "Chok ", trackArtist: " I have To Say # 1 (ELECTRO BAMM Remix)", file: "http://promodj.com/download/6979282/Chok%20-%20I%20have%20To%20Say%20%23%201%20%28ELECTRO%20BAMM%20Remix%29%20%28promodj.com%29.mp3", thumb: "https://i1.sndcdn.com/artworks-000223646898-8lp8kr-t500x500.jpg"},
{trackName: "FILV ", trackArtist: " Clandestina (BONDAR DJ REMIX 2020)", file: "http://promodj.com/download/6979272/FILV%20-%20Clandestina%20%28BONDAR%20DJ%20REMIX%202020%29%20%28promodj.com%29.mp3", thumb: "https://i1.sndcdn.com/artworks-000223646898-8lp8kr-t500x500.jpg"},
{trackName: "Roman Petrov ", trackArtist: " The Barber of Your Heart (Maxim Keks & FuZzee Remix)", file: "http://promodj.com/download/6979254/Roman%20Petrov%20-%20The%20Barber%20of%20Your%20Heart%20%28Maxim%20Keks%20%26%20FuZzee%20Remix%29%20%28promodj.com%29.mp3", thumb: "https://i1.sndcdn.com/artworks-000223646898-8lp8kr-t500x500.jpg"},
{trackName: "Fancy ", trackArtist: " Flames of love (Serj Bezoluk radio remix)", file: "http://promodj.com/download/6979248/Fancy%20-%20Flames%20of%20love%20%28Serj%20Bezoluk%20radio%20remix%29%20%28promodj.com%29.mp3", thumb: "https://i1.sndcdn.com/artworks-000223646898-8lp8kr-t500x500.jpg"},
{trackName: "Roman Petrov ", trackArtist: " The Barber of Your Heart (Maxim Keks & FuZzee Remix)", file: "http://promodj.com/download/6979242/Roman%20Petrov%20-%20The%20Barber%20of%20Your%20Heart%20%28Maxim%20Keks%20%26%20FuZzee%20Remix%29%20%28promodj.com%29.mp3", thumb: "https://i1.sndcdn.com/artworks-000223646898-8lp8kr-t500x500.jpg"},
{trackName: "ДОЛЯ ", trackArtist: " КРИЛА (DJ Karimov & DJ Mephisto Remix)", file: "http://promodj.com/download/6979498/%D0%94%D0%9E%D0%9B%D0%AF%20-%20%D0%9A%D0%A0%D0%98%D0%9B%D0%90%20%28DJ%20Karimov%20%26%20DJ%20Mephisto%20Remix%29%20%28promodj.com%29.mp3", thumb: "https://i1.sndcdn.com/artworks-000223646898-8lp8kr-t500x500.jpg"},
{trackName: "ДОЛЯ ", trackArtist: " КРИЛА (DJ Karimov & DJ Mephisto Radio Remix)", file: "http://promodj.com/download/6979497/%D0%94%D0%9E%D0%9B%D0%AF%20-%20%D0%9A%D0%A0%D0%98%D0%9B%D0%90%20%28DJ%20Karimov%20%26%20DJ%20Mephisto%20Radio%20Remix%29%20%28promodj.com%29.mp3", thumb: "https://i1.sndcdn.com/artworks-000223646898-8lp8kr-t500x500.jpg"},
{trackName: "Анна Филипчук – Любовь", trackArtist: "война (Ayn D Remix)", file: "http://promodj.com/download/6979463/%D0%90%D0%BD%D0%BD%D0%B0%20%D0%A4%D0%B8%D0%BB%D0%B8%D0%BF%D1%87%D1%83%D0%BA%20%E2%80%93%20%D0%9B%D1%8E%D0%B1%D0%BE%D0%B2%D1%8C-%D0%B2%D0%BE%D0%B9%D0%BD%D0%B0%20%28Ayn%20D%20Remix%29%20%28promodj.com%29.mp3", thumb: "https://i1.sndcdn.com/artworks-000223646898-8lp8kr-t500x500.jpg"},
{trackName: "SkyDeezs ", trackArtist: " Tetris", file: "http://promodj.com/download/6979441/SkyDeezs%20-%20Tetris%20%28promodj.com%29.mp3", thumb: "https://i1.sndcdn.com/artworks-000223646898-8lp8kr-t500x500.jpg"},
{trackName: "French Montana feat. City Girls ", trackArtist: " Wiggle It (Dj Maloy Dj Suvorov Remix)", file: "http://promodj.com/download/6979373/French%20Montana%20feat.%20City%20Girls%20-%20Wiggle%20It%20%28Dj%20Maloy%20Dj%20Suvorov%20Remix%29%20%28promodj.com%29.mp3", thumb: "https://i1.sndcdn.com/artworks-000223646898-8lp8kr-t500x500.jpg"},
{trackName: "Akon Feat. Eminem ", trackArtist: " Smack That (DJ MALOY Mash Up)", file: "http://promodj.com/download/6979368/Akon%20Feat.%20Eminem%20-%20Smack%20That%20%28DJ%20MALOY%20Mash%20Up%29%20%28promodj.com%29.mp3", thumb: "https://i1.sndcdn.com/artworks-000223646898-8lp8kr-t500x500.jpg"},
{trackName: "Chok ", trackArtist: " I Have to Say (Bezumno Remix)", file: "http://promodj.com/download/6979297/Chok%20-%20I%20Have%20to%20Say%20%28Bezumno%20Remix%29%20%28promodj.com%29.mp3", thumb: "https://i1.sndcdn.com/artworks-000223646898-8lp8kr-t500x500.jpg"},
{trackName: "Roman Petrov ", trackArtist: " The Barber of Your Heart (Julio Woots & Yιόγκι Remix)", file: "http://promodj.com/download/6979265/Roman%20Petrov%20-%20The%20Barber%20of%20Your%20Heart%20%28Julio%20Woots%20%26%20Y%CE%B9%CF%8C%CE%B3%CE%BA%CE%B9%20Remix%29%20%28promodj.com%29.mp3", thumb: "https://i1.sndcdn.com/artworks-000223646898-8lp8kr-t500x500.jpg"},
{trackName: "Virtual Life ", trackArtist: " Array Of Motion", file: "http://promodj.com/download/6979262/Virtual%20Life%20-%20Array%20Of%20Motion%20%28promodj.com%29.mp3", thumb: "https://i1.sndcdn.com/artworks-000223646898-8lp8kr-t500x500.jpg"},
{trackName: "Sadraddin ", trackArtist: " Алия (Kuka Remix)", file: "http://promodj.com/download/6979240/Sadraddin%20-%20%D0%90%D0%BB%D0%B8%D1%8F%20%28Kuka%20Remix%29%20%28promodj.com%29.mp3", thumb: "https://i1.sndcdn.com/artworks-000223646898-8lp8kr-t500x500.jpg"},
{trackName: "chichigaga ", trackArtist: " love me", file: "http://promodj.com/download/6979228/chichigaga%20-%20love%20me%20%28promodj.com%29.mp3", thumb: "https://i1.sndcdn.com/artworks-000223646898-8lp8kr-t500x500.jpg"},
{trackName: "ONINO ", trackArtist: " Педаль в пол (Glazur & XM Remix)", file: "http://promodj.com/download/6979221/ONINO%20-%20%D0%9F%D0%B5%D0%B4%D0%B0%D0%BB%D1%8C%20%D0%B2%20%D0%BF%D0%BE%D0%BB%20%28Glazur%20%26%20XM%20Remix%29%20%28promodj.com%29.mp3", thumb: "https://i1.sndcdn.com/artworks-000223646898-8lp8kr-t500x500.jpg"},
{trackName: "10eezy & Rimas ", trackArtist: " Буду Молодым (Glazur & XM Remix)", file: "http://promodj.com/download/6979212/10eezy%20%26%20Rimas%20-%20%D0%91%D1%83%D0%B4%D1%83%20%D0%9C%D0%BE%D0%BB%D0%BE%D0%B4%D1%8B%D0%BC%20%28Glazur%20%26%20XM%20Remix%29%20%28promodj.com%29.mp3", thumb: "https://i1.sndcdn.com/artworks-000223646898-8lp8kr-t500x500.jpg"},
{trackName: "JONY ", trackArtist: " Комета (Glazur & Olmega Remix)", file: "http://promodj.com/download/6979211/JONY%20-%20%D0%9A%D0%BE%D0%BC%D0%B5%D1%82%D0%B0%20%28Glazur%20%26%20Olmega%20Remix%29%20%28promodj.com%29.mp3", thumb: "https://i1.sndcdn.com/artworks-000223646898-8lp8kr-t500x500.jpg"},
{trackName: "Liza Evans ", trackArtist: " В Бокале Вина (Glazur & XM Remix)", file: "http://promodj.com/download/6979205/Liza%20Evans%20-%20%D0%92%20%D0%91%D0%BE%D0%BA%D0%B0%D0%BB%D0%B5%20%D0%92%D0%B8%D0%BD%D0%B0%20%28Glazur%20%26%20XM%20Remix%29%20%28promodj.com%29.mp3", thumb: "https://i1.sndcdn.com/artworks-000223646898-8lp8kr-t500x500.jpg"}
]}
  $(".jAudio").jAudio(t);
})();
