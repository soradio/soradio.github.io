(function(window, undefined) {

'use strict';

var AudioPlayer = (function() {

  // Player vars!
  var
  docTitle = document.title,
  player   = document.getElementById('ap'),
  playBtn,
  playSvg,
  playSvgPath,
  prevBtn,
  nextBtn,
  plBtn,
  repeatBtn,
  volumeBtn,
  progressBar,
  preloadBar,
  curTime,
  durTime,
  trackTitle,
  audio,
  index = 0,
  playList,
  volumeBar,
  wheelVolumeValue = 0,
  volumeLength,
  repeating = false,
  seeking = false,
  rightClick = false,
  apActive = false,
  // playlist vars
  pl,
  plUl,
  plLi,
  tplList =
            '<li class="pl-list" data-track="{count}">'+
              '<div class="pl-list__track">'+
                '<div class="pl-list__icon"></div>'+
                '<div class="pl-list__eq">'+
                  '<div class="eq">'+
                    '<div class="eq__bar"></div>'+
                    '<div class="eq__bar"></div>'+
                    '<div class="eq__bar"></div>'+
                    '<div class="eq__bar"></div>'+
                  '</div>'+
                '</div>'+
              '</div>'+
              '<div class="pl-list__title">{title}</div>'+
            '</li>',
  // settings
  settings = {
    volume        : 1,
    changeDocTitle: true,
    confirmClose  : true,
    autoPlay      : false,
    buffered      : true,
    notification  : true,
    playList      : []
  };

  function init(options) {

    if(!('classList' in document.documentElement)) {
      return false;
    }

    if(apActive || player === null) {
      return 'Player already init';
    }

    settings = extend(settings, options);

    // get player elements
    playBtn        = player.querySelector('.ap__controls--toggle');
    playSvg        = playBtn.querySelector('.icon-play');
    playSvgPath    = playSvg.querySelector('path');
    prevBtn        = player.querySelector('.ap__controls--prev');
    nextBtn        = player.querySelector('.ap__controls--next');
    repeatBtn      = player.querySelector('.ap__controls--repeat');
    volumeBtn      = player.querySelector('.volume-btn');
    plBtn          = player.querySelector('.ap__controls--playlist');
    curTime        = player.querySelector('.track__time--current');
    durTime        = player.querySelector('.track__time--duration');
    trackTitle     = player.querySelector('.track__title');
    progressBar    = player.querySelector('.progress__bar');
    preloadBar     = player.querySelector('.progress__preload');
    volumeBar      = player.querySelector('.volume__bar');

    playList = settings.playList;

    playBtn.addEventListener('click', playToggle, false);
    volumeBtn.addEventListener('click', volumeToggle, false);
    repeatBtn.addEventListener('click', repeatToggle, false);

    progressBar.closest('.progress-container').addEventListener('mousedown', handlerBar, false);
    progressBar.closest('.progress-container').addEventListener('mousemove', seek, false);

    document.documentElement.addEventListener('mouseup', seekingFalse, false);

    volumeBar.closest('.volume').addEventListener('mousedown', handlerVol, false);
    volumeBar.closest('.volume').addEventListener('mousemove', setVolume);
    volumeBar.closest('.volume').addEventListener(wheel(), setVolume, false);

    document.documentElement.addEventListener('mouseup', seekingFalse, false);

    prevBtn.addEventListener('click', prev, false);
    nextBtn.addEventListener('click', next, false);

    apActive = true;

    // Create playlist
    renderPL();
    plBtn.addEventListener('click', plToggle, false);

    // Create audio object
    audio = new Audio();
    audio.volume = settings.volume;
    audio.preload = 'auto';

    audio.addEventListener('error', errorHandler, false);
    audio.addEventListener('timeupdate', timeUpdate, false);
    audio.addEventListener('ended', doEnd, false);

    volumeBar.style.height = audio.volume * 100 + '%';
    volumeLength = volumeBar.css('height');

    if(settings.confirmClose) {
      window.addEventListener("beforeunload", beforeUnload, false);
    }

    if(isEmptyList()) {
      return false;
    }
    audio.src = playList[index].file;
    trackTitle.innerHTML = playList[index].title;

    if(settings.autoPlay) {
      audio.play();
      playBtn.classList.add('is-playing');
      playSvgPath.setAttribute('d', playSvg.getAttribute('data-pause'));
      plLi[index].classList.add('pl-list--current');
      notify(playList[index].title, {
        icon: playList[index].icon,
        body: 'Now playing'
      });
    }
  }

  function changeDocumentTitle(title) {
    if(settings.changeDocTitle) {
      if(title) {
        document.title = title;
      }
      else {
        document.title = docTitle;
      }
    }
  }

  function beforeUnload(evt) {
    if(!audio.paused) {
      var message = 'Music still playing';
      evt.returnValue = message;
      return message;
    }
  }

  function errorHandler(evt) {
    if(isEmptyList()) {
      return;
    }
    var mediaError = {
      '1': 'MEDIA_ERR_ABORTED',
      '2': 'MEDIA_ERR_NETWORK',
      '3': 'MEDIA_ERR_DECODE',
      '4': 'MEDIA_ERR_SRC_NOT_SUPPORTED'
    };
    audio.pause();
    curTime.innerHTML = '--';
    durTime.innerHTML = '--';
    progressBar.style.width = 0;
    preloadBar.style.width = 0;
    playBtn.classList.remove('is-playing');
    playSvgPath.setAttribute('d', playSvg.getAttribute('data-play'));
    plLi[index] && plLi[index].classList.remove('pl-list--current');
    changeDocumentTitle();
    throw new Error('Houston we have a problem: ' + mediaError[evt.target.error.code]);
  }

/**
 * UPDATE PL
 */
  function updatePL(addList) {
    if(!apActive) {
      return 'Player is not yet initialized';
    }
    if(!Array.isArray(addList)) {
      return;
    }
    if(addList.length === 0) {
      return;
    }

    var count = playList.length;
    var html  = [];
    playList.push.apply(playList, addList);
    addList.forEach(function(item) {
      html.push(
        tplList.replace('{count}', count++).replace('{title}', item.title)
      );
    });
    // If exist empty message
    if(plUl.querySelector('.pl-list--empty')) {
      plUl.removeChild( pl.querySelector('.pl-list--empty') );
      audio.src = playList[index].file;
      trackTitle.innerHTML = playList[index].title;
    }
    // Add song into playlist
    plUl.insertAdjacentHTML('beforeEnd', html.join(''));
    plLi = pl.querySelectorAll('li');
  }

/**
 *  PlayList methods
 */
    function renderPL() {
      var html = [];

      playList.forEach(function(item, i) {
        html.push(
          tplList.replace('{count}', i).replace('{title}', item.title)
        );
      });

      pl = create('div', {
        'className': 'pl-container',
        'id': 'pl',
        'innerHTML': '<ul class="pl-ul">' + (!isEmptyList() ? html.join('') : '<li class="pl-list--empty">PlayList is empty</li>') + '</ul>'
      });

      player.parentNode.insertBefore(pl, player.nextSibling);

      plUl = pl.querySelector('.pl-ul');
      plLi = plUl.querySelectorAll('li');

      pl.addEventListener('click', listHandler, false);
    }

    function listHandler(evt) {
      evt.preventDefault();

      if(evt.target.matches('.pl-list__title') || evt.target.matches('.pl-list__track') || evt.target.matches('.pl-list__icon') || evt.target.matches('.pl-list__eq') || evt.target.matches('.eq')) {
        var current = parseInt(evt.target.closest('.pl-list').getAttribute('data-track'), 10);
        if(index !== current) {
          index = current;
          play(current);
        }
        else {
          playToggle();
        }
      } else {
        if(!!evt.target.closest('.pl-list__remove')) {
          var parentEl = evt.target.closest('.pl-list');
          var isDel = parseInt(parentEl.getAttribute('data-track'), 10);

          playList.splice(isDel, 1);
          parentEl.closest('.pl-ul').removeChild(parentEl);

          plLi = pl.querySelectorAll('li');

          [].forEach.call(plLi, function(el, i) {
            el.setAttribute('data-track', i);
          });

          if(!audio.paused) {

            if(isDel === index) {
              play(index);
            }

          }
          else {
            if(isEmptyList()) {
              clearAll();
            }
            else {
              if(isDel === index) {
                if(isDel > playList.length - 1) {
                  index -= 1;
                }
                audio.src = playList[index].file;
                trackTitle.innerHTML = playList[index].title;
                progressBar.style.width = 0;
              }
            }
          }
          if(isDel < index) {
            index--;
          }
        }
      }
    }

    function plActive() {
      if(audio.paused) {
        plLi[index].classList.remove('pl-list--current');
        return;
      }
      var current = index;
      for(var i = 0, len = plLi.length; len > i; i++) {
        plLi[i].classList.remove('pl-list--current');
      }
      plLi[current].classList.add('pl-list--current');
    }


/**
 * Player methods
 */
  function play(currentIndex) {

    if(isEmptyList()) {
      return clearAll();
    }

    index = (currentIndex + playList.length) % playList.length;

    audio.src = playList[index].file;
    trackTitle.innerHTML = playList[index].title;

    // Change document title
    changeDocumentTitle(playList[index].title);

    // Audio play
    audio.play();

    // Show notification
    notify(playList[index].title, {
      icon: playList[index].icon,
      body: 'Now playing',
      tag: 'music-player'
    });

    // Toggle play button
    playBtn.classList.add('is-playing');
    playSvgPath.setAttribute('d', playSvg.getAttribute('data-pause'));

    // Set active song playlist
    plActive();
  }

  function prev() {
    play(index - 1);
  }

  function next() {
    play(index + 1);
  }

  function isEmptyList() {
    return playList.length === 0;
  }

  function clearAll() {
    audio.pause();
    audio.src = '';
    trackTitle.innerHTML = 'queue is empty';
    curTime.innerHTML = '--';
    durTime.innerHTML = '--';
    progressBar.style.width = 0;
    preloadBar.style.width = 0;
    playBtn.classList.remove('is-playing');
    playSvgPath.setAttribute('d', playSvg.getAttribute('data-play'));
    if(!plUl.querySelector('.pl-list--empty')) {
      plUl.innerHTML = '<li class="pl-list--empty">PlayList is empty</li>';
    }
    changeDocumentTitle();
  }

  function playToggle() {
    if(isEmptyList()) {
      return;
    }
    if(audio.paused) {

      if(audio.currentTime === 0) {
        notify(playList[index].title, {
          icon: playList[index].icon,
          body: 'Now playing'
        });
      }
      changeDocumentTitle(playList[index].title);

      audio.play();

      playBtn.classList.add('is-playing');
      playSvgPath.setAttribute('d', playSvg.getAttribute('data-pause'));
    }
    else {
      changeDocumentTitle();
      audio.pause();
      playBtn.classList.remove('is-playing');
      playSvgPath.setAttribute('d', playSvg.getAttribute('data-play'));
    }
    plActive();
  }

  function volumeToggle() {
    if(audio.muted) {
      if(parseInt(volumeLength, 10) === 0) {
        volumeBar.style.height = settings.volume * 100 + '%';
        audio.volume = settings.volume;
      }
      else {
        volumeBar.style.height = volumeLength;
      }
      audio.muted = false;
      volumeBtn.classList.remove('has-muted');
    }
    else {
      audio.muted = true;
      volumeBar.style.height = 0;
      volumeBtn.classList.add('has-muted');
    }
  }

  function repeatToggle() {
    if(repeatBtn.classList.contains('is-active')) {
      repeating = false;
      repeatBtn.classList.remove('is-active');
    }
    else {
      repeating = true;
      repeatBtn.classList.add('is-active');
    }
  }

  function plToggle() {
    plBtn.classList.toggle('is-active');
    pl.classList.toggle('h-show');
  }

  function timeUpdate() {
    if(audio.readyState === 0) return;

    var barlength = Math.round(audio.currentTime * (100 / audio.duration));
    progressBar.style.width = barlength + '%';

    var
    curMins = Math.floor(audio.currentTime / 60),
    curSecs = Math.floor(audio.currentTime - curMins * 60),
    mins = Math.floor(audio.duration / 60),
    secs = Math.floor(audio.duration - mins * 60);
    (curSecs < 10) && (curSecs = '0' + curSecs);
    (secs < 10) && (secs = '0' + secs);

    curTime.innerHTML = curMins + ':' + curSecs;
    durTime.innerHTML = mins + ':' + secs;

    if(settings.buffered) {
      var buffered = audio.buffered;
      if(buffered.length) {
        var loaded = Math.round(100 * buffered.end(0) / audio.duration);
        preloadBar.style.width = loaded + '%';
      }
    }
  }

  /**
   * TODO shuffle
   */
  function shuffle() {
    if(shuffle) {
      index = Math.round(Math.random() * playList.length);
    }
  }

  function doEnd() {
    if(index === playList.length - 1) {
      if(!repeating) {
        audio.pause();
        plActive();
        playBtn.classList.remove('is-playing');
        playSvgPath.setAttribute('d', playSvg.getAttribute('data-play'));
        return;
      }
      else {
        play(0);
      }
    }
    else {
      play(index + 1);
    }
  }

  function moveBar(evt, el, dir) {
    var value;
    if(dir === 'horizontal') {
      value = Math.round( ((evt.clientX - el.offset().left) + window.pageXOffset)  * 100 / el.parentNode.offsetWidth);
      el.style.width = value + '%';
      return value;
    }
    else {
      if(evt.type === wheel()) {
        value = parseInt(volumeLength, 10);
        var delta = evt.deltaY || evt.detail || -evt.wheelDelta;
        value = (delta > 0) ? value - 10 : value + 10;
      }
      else {
        var offset = (el.offset().top + el.offsetHeight) - window.pageYOffset;
        value = Math.round((offset - evt.clientY));
      }
      if(value > 100) value = wheelVolumeValue = 100;
      if(value < 0) value = wheelVolumeValue = 0;
      volumeBar.style.height = value + '%';
      return value;
    }
  }

  function handlerBar(evt) {
    rightClick = (evt.which === 3) ? true : false;
    seeking = true;
    seek(evt);
  }

  function handlerVol(evt) {
    rightClick = (evt.which === 3) ? true : false;
    seeking = true;
    setVolume(evt);
  }

  function seek(evt) {
    if(seeking && rightClick === false && audio.readyState !== 0) {
      var value = moveBar(evt, progressBar, 'horizontal');
      audio.currentTime = audio.duration * (value / 100);
    }
  }

  function seekingFalse() {
    seeking = false;
  }

  function setVolume(evt) {
    evt.preventDefault();
    volumeLength = volumeBar.css('height');
    if(seeking && rightClick === false || evt.type === wheel()) {
      var value = moveBar(evt, volumeBar.parentNode, 'vertical') / 100;
      if(value <= 0) {
        audio.volume = 0;
        audio.muted = true;
        volumeBtn.classList.add('has-muted');
      }
      else {
        if(audio.muted) audio.muted = false;
        audio.volume = value;
        volumeBtn.classList.remove('has-muted');
      }
    }
  }

  function notify(title, attr) {
    if(!settings.notification) {
      return;
    }
    if(window.Notification === undefined) {
      return;
    }
    attr.tag = 'AP music player';
    window.Notification.requestPermission(function(access) {
      if(access === 'granted') {
        var notice = new Notification(title.substr(0, 110), attr);
        setTimeout(notice.close.bind(notice), 5000);
      }
    });
  }

/* Destroy method. Clear All */
  function destroy() {
    if(!apActive) return;

    if(settings.confirmClose) {
      window.removeEventListener('beforeunload', beforeUnload, false);
    }

    playBtn.removeEventListener('click', playToggle, false);
    volumeBtn.removeEventListener('click', volumeToggle, false);
    repeatBtn.removeEventListener('click', repeatToggle, false);
    plBtn.removeEventListener('click', plToggle, false);

    progressBar.closest('.progress-container').removeEventListener('mousedown', handlerBar, false);
    progressBar.closest('.progress-container').removeEventListener('mousemove', seek, false);
    document.documentElement.removeEventListener('mouseup', seekingFalse, false);

    volumeBar.closest('.volume').removeEventListener('mousedown', handlerVol, false);
    volumeBar.closest('.volume').removeEventListener('mousemove', setVolume);
    volumeBar.closest('.volume').removeEventListener(wheel(), setVolume);
    document.documentElement.removeEventListener('mouseup', seekingFalse, false);

    prevBtn.removeEventListener('click', prev, false);
    nextBtn.removeEventListener('click', next, false);

    audio.removeEventListener('error', errorHandler, false);
    audio.removeEventListener('timeupdate', timeUpdate, false);
    audio.removeEventListener('ended', doEnd, false);

    // Playlist
    pl.removeEventListener('click', listHandler, false);
    pl.parentNode.removeChild(pl);

    audio.pause();
    apActive = false;
    index = 0;

    playBtn.classList.remove('is-playing');
    playSvgPath.setAttribute('d', playSvg.getAttribute('data-play'));
    volumeBtn.classList.remove('has-muted');
    plBtn.classList.remove('is-active');
    repeatBtn.classList.remove('is-active');

    // Remove player from the DOM if necessary
    // player.parentNode.removeChild(player);
  }


/**
 *  Helpers
 */
  function wheel() {
    var wheel;
    if ('onwheel' in document) {
      wheel = 'wheel';
    } else if ('onmousewheel' in document) {
      wheel = 'mousewheel';
    } else {
      wheel = 'MozMousePixelScroll';
    }
    return wheel;
  }

  function extend(defaults, options) {
    for(var name in options) {
      if(defaults.hasOwnProperty(name)) {
        defaults[name] = options[name];
      }
    }
    return defaults;
  }
  
  function create(el, attr) {
    var element = document.createElement(el);
    if(attr) {
      for(var name in attr) {
        if(element[name] !== undefined) {
          element[name] = attr[name];
        }
      }
    }
    return element;
  }

  function getTrack(index) {
    return playList[index];
  }

  Element.prototype.offset = function() {
    var el = this.getBoundingClientRect(),
    scrollLeft = window.pageXOffset || document.documentElement.scrollLeft,
    scrollTop = window.pageYOffset || document.documentElement.scrollTop;

    return {
      top: el.top + scrollTop,
      left: el.left + scrollLeft
    };
  };

  Element.prototype.css = function(attr) {
    if(typeof attr === 'string') {
      return getComputedStyle(this, '')[attr];
    }
    else if(typeof attr === 'object') {
      for(var name in attr) {
        if(this.style[name] !== undefined) {
          this.style[name] = attr[name];
        }
      }
    }
  };

  // matches polyfill
  window.Element && function(ElementPrototype) {
      ElementPrototype.matches = ElementPrototype.matches ||
      ElementPrototype.matchesSelector ||
      ElementPrototype.webkitMatchesSelector ||
      ElementPrototype.msMatchesSelector ||
      function(selector) {
          var node = this, nodes = (node.parentNode || node.document).querySelectorAll(selector), i = -1;
          while (nodes[++i] && nodes[i] != node);
          return !!nodes[i];
      };
  }(Element.prototype);

  // closest polyfill
  window.Element && function(ElementPrototype) {
      ElementPrototype.closest = ElementPrototype.closest ||
      function(selector) {
          var el = this;
          while (el.matches && !el.matches(selector)) el = el.parentNode;
          return el.matches ? el : null;
      };
  }(Element.prototype);

/**
 *  Public methods
 */
  return {
    init: init,
    update: updatePL,
    destroy: destroy,
    getTrack: getTrack
  };

})();

window.AP = AudioPlayer;

})(window);

// TEST: image for web notifications
var iconImage = 'http://funkyimg.com/i/21pX5.png';

AP.init({
  playList: [
  {'icon': iconImage, 'title': 'Ternovoy - Popkorm (Dj Nejtrino & Dj Baur Remix)', 'file': 'http://promodj.com/download/6980763/Ternovoy%20-%20Popkorm%20%28Dj%20Nejtrino%20%26%20Dj%20Baur%20Remix%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Ilkay Sencan & Eugene Star & Relanium & Deen West - Do it (DJ Evin mashup) 124bpm', 'file': 'http://promodj.com/download/6974022/Ilkay%20Sencan%20%26%20Eugene%20Star%20%26%20Relanium%20%26%20Deen%20West%20-%20Do%20it%20%28DJ%20Evin%20mashup%29%20124bpm%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Stepan Nikulin - Tonight (Sax Edition) Radio', 'file': 'http://promodj.com/download/6971618/Stepan%20Nikulin%20-%20Tonight%20%28Sax%20Edition%29%20Radio%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Kris Cayden Vs. NGHMTRE x RNSOM feat. Bret James - Love Is On Fire Vs. The Killer (VLLV Trap MashUp)', 'file': 'http://promodj.com/download/6972153/Kris%20Cayden%20Vs.%20NGHMTRE%20x%20RNSOM%20feat.%20Bret%20James%20-%20Love%20Is%20On%20Fire%20Vs.%20The%20Killer%20%28VLLV%20Trap%20MashUp%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Sara Jo - Bez sna (Kizami x Ponk x Syntheticsax Remix Extended)', 'file': 'http://promodj.com/download/6830601/Sara%20Jo%20-%20Bez%20sna%20%28Kizami%20x%20Ponk%20x%20Syntheticsax%20Remix%20Extended%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Элджей & Habstrakt - Sosedy(Artem Zablocki MashUp)', 'file': 'http://promodj.com/download/6971086/%D0%AD%D0%BB%D0%B4%D0%B6%D0%B5%D0%B9%20%26%20Habstrakt%20-%20Sosedy%28Artem%20Zablocki%20MashUp%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'PVNTERV & roully - чупа чупс (NETRUM remix)', 'file': 'http://promodj.com/download/6965465/PVNTERV%20%26%20roully%20-%20%D1%87%D1%83%D0%BF%D0%B0%20%D1%87%D1%83%D0%BF%D1%81%20%28NETRUM%20remix%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Голди - Крестики-нолики (Dmitriy Smarts & Dimon Production Radio Remix)', 'file': 'http://promodj.com/download/6982961/%D0%93%D0%BE%D0%BB%D0%B4%D0%B8%20-%20%D0%9A%D1%80%D0%B5%D1%81%D1%82%D0%B8%D0%BA%D0%B8-%D0%BD%D0%BE%D0%BB%D0%B8%D0%BA%D0%B8%20%28Dmitriy%20Smarts%20%26%20Dimon%20Production%20Radio%20Remix%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Ellin Spring - People (BEATFORSALE)', 'file': 'http://promodj.com/download/6982852/Ellin%20Spring%20-%20People%20%28BEATFORSALE%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'DJ Di Mikelis - Is It Real (Original Mix)', 'file': 'http://promodj.com/download/6970611/DJ%20Di%20Mikelis%20-%20Is%20It%20Real%20%28Original%20Mix%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'HammAli & Navai - Прятки (Shnaps & Kolya Funk Remix)', 'file': 'http://promodj.com/download/6877032/HammAli%20%26%20Navai%20-%20%D0%9F%D1%80%D1%8F%D1%82%D0%BA%D0%B8%20%28Shnaps%20%26%20Kolya%20Funk%20Remix%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Neteta - Feel It (EDscore Remix)', 'file': 'http://promodj.com/download/6936546/Neteta%20-%20Feel%20It%20%28EDscore%20Remix%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'NЮ - Веснушки (Ice Remix)', 'file': 'http://promodj.com/download/6902076/N%D0%AE%20-%20%D0%92%D0%B5%D1%81%D0%BD%D1%83%D1%88%D0%BA%D0%B8%20%28Ice%20Remix%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Chok - I Have to Say (RAKETA 2095 Remix)', 'file': 'http://promodj.com/download/6976965/Chok%20-%20I%20Have%20to%20Say%20%28RAKETA%202095%20Remix%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'RASA - Алые-алые (DJ Blunt Remix)', 'file': 'http://promodj.com/download/6976792/RASA%20-%20%D0%90%D0%BB%D1%8B%D0%B5-%D0%B0%D0%BB%D1%8B%D0%B5%20%28DJ%20Blunt%20Remix%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Джаро & Ханза vs. XIDШ -  Королева танцпола (Bazz Mash Up)', 'file': 'http://promodj.com/download/6980155/%D0%94%D0%B6%D0%B0%D1%80%D0%BE%20%26%20%D0%A5%D0%B0%D0%BD%D0%B7%D0%B0%20vs.%20XID%D0%A8%20-%20%20%D0%9A%D0%BE%D1%80%D0%BE%D0%BB%D0%B5%D0%B2%D0%B0%20%D1%82%D0%B0%D0%BD%D1%86%D0%BF%D0%BE%D0%BB%D0%B0%20%28Bazz%20Mash%20Up%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Chok - I Have To Say (XF Remix)', 'file': 'http://promodj.com/download/6979322/Chok%20-%20I%20Have%20To%20Say%20%28XF%20Remix%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Den Mayer - Waves Of Summer (Preview) - Yeiskomp Records', 'file': 'http://promodj.com/download/6975366/Den%20Mayer%20-%20Waves%20Of%20Summer%20%28Preview%29%20-%20Yeiskomp%20Records%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'S BEATER - Sheydip (DJ AZATX Remix)', 'file': 'http://promodj.com/download/6829875/S%20BEATER%20-%20Sheydip%20%28DJ%20AZATX%20Remix%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Тилэкс - Понарошку (Vlad Pingin Remix)', 'file': 'http://promodj.com/download/6980097/%D0%A2%D0%B8%D0%BB%D1%8D%D0%BA%D1%81%20-%20%D0%9F%D0%BE%D0%BD%D0%B0%D1%80%D0%BE%D1%88%D0%BA%D1%83%20%28Vlad%20Pingin%20Remix%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Юрий Шатунов - Розовый Вечер (Vostokov Refresh)', 'file': 'http://promodj.com/download/6920044/%D0%AE%D1%80%D0%B8%D0%B9%20%D0%A8%D0%B0%D1%82%D1%83%D0%BD%D0%BE%D0%B2%20-%20%D0%A0%D0%BE%D0%B7%D0%BE%D0%B2%D1%8B%D0%B9%20%D0%92%D0%B5%D1%87%D0%B5%D1%80%20%28Vostokov%20Refresh%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Arturro Mass - Тільки для тебе ( Alex Fleev Remix )', 'file': 'http://promodj.com/download/6974400/Arturro%20Mass%20-%20%D0%A2%D1%96%D0%BB%D1%8C%D0%BA%D0%B8%20%D0%B4%D0%BB%D1%8F%20%D1%82%D0%B5%D0%B1%D0%B5%20%28%20Alex%20Fleev%20Remix%20%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Steve Aoki, Alok - Do It Again (Binayz & S-Nike Rmx)', 'file': 'http://promodj.com/download/6815234/Steve%20Aoki%2C%20Alok%20-%20Do%20It%20Again%20%28Binayz%20%26%20S-Nike%20Rmx%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Maroon 5 feat. Christina Aguilera - Moves Like Jagger (Jenia Smile & Ser Twister Remix)', 'file': 'http://promodj.com/download/6976824/Maroon%205%20feat.%20Christina%20Aguilera%20-%20Moves%20Like%20Jagger%20%28Jenia%20Smile%20%26%20Ser%20Twister%20Remix%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Big Tape x Басков - Gimme to Руки твои целовать (Sash aka Frost x Hak Mix Mash-UP)', 'file': 'http://promodj.com/download/6970419/Big%20Tape%20x%20%D0%91%D0%B0%D1%81%D0%BA%D0%BE%D0%B2%20-%20Gimme%20to%20%D0%A0%D1%83%D0%BA%D0%B8%20%D1%82%D0%B2%D0%BE%D0%B8%20%D1%86%D0%B5%D0%BB%D0%BE%D0%B2%D0%B0%D1%82%D1%8C%20%28Sash%20aka%20Frost%20x%20Hak%20Mix%20Mash-UP%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'SoundLab - COVID', 'file': 'http://promodj.com/download/6979908/SoundLab%20-%20COVID%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Малиновский - Просто позвони ( Dj Vozgamenchuk remix )', 'file': 'http://promodj.com/download/6973688/%D0%9C%D0%B0%D0%BB%D0%B8%D0%BD%D0%BE%D0%B2%D1%81%D0%BA%D0%B8%D0%B9%20-%20%D0%9F%D1%80%D0%BE%D1%81%D1%82%D0%BE%20%D0%BF%D0%BE%D0%B7%D0%B2%D0%BE%D0%BD%D0%B8%20%28%20Dj%20Vozgamenchuk%20remix%20%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Клава Кока - Зая (Ramirez Remix)', 'file': 'http://promodj.com/download/6880865/%D0%9A%D0%BB%D0%B0%D0%B2%D0%B0%20%D0%9A%D0%BE%D0%BA%D0%B0%20-%20%D0%97%D0%B0%D1%8F%20%28Ramirez%20Remix%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'O.Cloque - Выпили меня ( Innasounnd Remix )', 'file': 'http://promodj.com/download/6975254/O.Cloque%20-%20%D0%92%D1%8B%D0%BF%D0%B8%D0%BB%D0%B8%20%D0%BC%D0%B5%D0%BD%D1%8F%20%28%20Innasounnd%20Remix%20%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Тимур Timbigfamily  - Напиться надо (Monkey MO Remix)', 'file': 'http://promodj.com/download/6822840/%D0%A2%D0%B8%D0%BC%D1%83%D1%80%20Timbigfamily%20%20-%20%D0%9D%D0%B0%D0%BF%D0%B8%D1%82%D1%8C%D1%81%D1%8F%20%D0%BD%D0%B0%D0%B4%D0%BE%20%28Monkey%20MO%20Remix%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': '3+1 feat. Jerry Gozie — Never give up (GNTLS Remix)', 'file': 'http://promodj.com/download/6834247/3%2B1%20feat.%20Jerry%20Gozie%20%E2%80%94%20Never%20give%20up%20%28GNTLS%20Remix%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'FILV - Balenciaga (Vladislav K MashUp 2k20)', 'file': 'http://promodj.com/download/6972263/FILV%20-%20Balenciaga%20%28Vladislav%20K%20MashUp%202k20%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'ФЕНИКС - Юрий Баклушин & Вита Горовенко', 'file': 'http://promodj.com/download/6970624/%D0%A4%D0%95%D0%9D%D0%98%D0%9A%D0%A1%20-%20%D0%AE%D1%80%D0%B8%D0%B9%20%D0%91%D0%B0%D0%BA%D0%BB%D1%83%D1%88%D0%B8%D0%BD%20%26%20%D0%92%D0%B8%D1%82%D0%B0%20%D0%93%D0%BE%D1%80%D0%BE%D0%B2%D0%B5%D0%BD%D0%BA%D0%BE%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Die Antwoord x Don Diablo - Babys On The Rhythm (DJ Miller x DJ Alex Milano Bootymix)', 'file': 'http://promodj.com/download/6839401/Die%20Antwoord%20x%20Don%20Diablo%20-%20Baby%27s%20On%20The%20Rhythm%20%28DJ%20Miller%20x%20DJ%20Alex%20Milano%20Bootymix%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'GROSU - Луна (Dj Romantic remix)', 'file': 'http://promodj.com/download/6898728/GROSU%20-%20%D0%9B%D1%83%D0%BD%D0%B0%20%28Dj%20Romantic%20remix%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Ханна - Музыка звучит (Nejtrino & Baur Extended Remix)', 'file': 'http://promodj.com/download/6879193/%D0%A5%D0%B0%D0%BD%D0%BD%D0%B0%20-%20%D0%9C%D1%83%D0%B7%D1%8B%D0%BA%D0%B0%20%D0%B7%D0%B2%D1%83%D1%87%D0%B8%D1%82%20%28Nejtrino%20%26%20Baur%20Extended%20Remix%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Jah Khalib - Джадуа (Misha ZAM Remix)', 'file': 'http://promodj.com/download/6905559/Jah%20Khalib%20-%20%D0%94%D0%B6%D0%B0%D0%B4%D1%83%D0%B0%20%28Misha%20ZAM%20Remix%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Meduza ft. Goodboys - Piece Of Your Heart (Dj Amor Remix)', 'file': 'http://promodj.com/download/6798266/Meduza%20ft.%20Goodboys%20-%20Piece%20Of%20Your%20Heart%20%28Dj%20Amor%20Remix%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Кабакам кабацкий дым', 'file': 'http://promodj.com/download/6978318/%D0%9A%D0%B0%D0%B1%D0%B0%D0%BA%D0%B0%D0%BC%20%D0%BA%D0%B0%D0%B1%D0%B0%D1%86%D0%BA%D0%B8%D0%B9%20%D0%B4%D1%8B%D0%BC%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Dj David Dan Project -  CHOICE ( Original Mix )', 'file': 'http://promodj.com/download/6974458/Dj%20David%20Dan%20Project%20-%20%20CHOICE%20%28%20Original%20Mix%20%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Pavel L. - Dawn', 'file': 'http://promodj.com/download/6983308/Pavel%20L.%20-%20Dawn%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Александр Лист ft. JD Jupiter - Байкал (EDscore Remix)', 'file': 'http://promodj.com/download/6899449/%D0%90%D0%BB%D0%B5%D0%BA%D1%81%D0%B0%D0%BD%D0%B4%D1%80%20%D0%9B%D0%B8%D1%81%D1%82%20ft.%20JD%20Jupiter%20-%20%D0%91%D0%B0%D0%B9%D0%BA%D0%B0%D0%BB%20%28EDscore%20Remix%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Макс Корж - Амстердам (Iblis remix radio edit)', 'file': 'http://promodj.com/download/6979004/%D0%9C%D0%B0%D0%BA%D1%81%20%D0%9A%D0%BE%D1%80%D0%B6%20-%20%D0%90%D0%BC%D1%81%D1%82%D0%B5%D1%80%D0%B4%D0%B0%D0%BC%20%28Iblis%20remix%20radio%20edit%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Niletto – Ты такая красивая (DJ Terre Remix)', 'file': 'http://promodj.com/download/6978403/Niletto%20%E2%80%93%20%D0%A2%D1%8B%20%D1%82%D0%B0%D0%BA%D0%B0%D1%8F%20%D0%BA%D1%80%D0%B0%D1%81%D0%B8%D0%B2%D0%B0%D1%8F%20%28DJ%20Terre%20Remix%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': '3+1 feat. Jerry Gozie — Never give up (EDscore Remix)', 'file': 'http://promodj.com/download/6841781/3%2B1%20feat.%20Jerry%20Gozie%20%E2%80%94%20Never%20give%20up%20%28EDscore%20Remix%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Nelly Furtado - Say it right (Alex Spite Remix)', 'file': 'http://promodj.com/download/6968681/Nelly%20Furtado%20-%20Say%20it%20right%20%28Alex%20Spite%20Remix%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Idris & Leos, Jony feat. Mahmut Orhan - Девочка Родная Из Снов [Rene Various MashUp]', 'file': 'http://promodj.com/download/6983481/Idris%20%26%20Leos%2C%20Jony%20feat.%20Mahmut%20Orhan%20-%20%D0%94%D0%B5%D0%B2%D0%BE%D1%87%D0%BA%D0%B0%20%D0%A0%D0%BE%D0%B4%D0%BD%D0%B0%D1%8F%20%D0%98%D0%B7%20%D0%A1%D0%BD%D0%BE%D0%B2%20%5BRene%20Various%20MashUp%5D%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Fly & Sasha Fashion - Youre Something Special (Original Mix)', 'file': 'http://promodj.com/download/6971370/Fly%20%26%20Sasha%20Fashion%20-%20You%27re%20Something%20Special%20%28Original%20Mix%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'КОФЕ, СИГАРЕТЫ, КОНЬЯЧОК - Евгений Курский & Милалита', 'file': 'http://promodj.com/download/6968811/%D0%9A%D0%9E%D0%A4%D0%95%2C%20%D0%A1%D0%98%D0%93%D0%90%D0%A0%D0%95%D0%A2%D0%AB%2C%20%D0%9A%D0%9E%D0%9D%D0%AC%D0%AF%D0%A7%D0%9E%D0%9A%20-%20%D0%95%D0%B2%D0%B3%D0%B5%D0%BD%D0%B8%D0%B9%20%D0%9A%D1%83%D1%80%D1%81%D0%BA%D0%B8%D0%B9%20%26%20%D0%9C%D0%B8%D0%BB%D0%B0%D0%BB%D0%B8%D1%82%D0%B0%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Тайпан, Agunda - Луна не знает пути (Serg Shenon & Yudzhin Radio Remix)', 'file': 'http://promodj.com/download/6980565/%D0%A2%D0%B0%D0%B9%D0%BF%D0%B0%D0%BD%2C%20Agunda%20-%20%D0%9B%D1%83%D0%BD%D0%B0%20%D0%BD%D0%B5%20%D0%B7%D0%BD%D0%B0%D0%B5%D1%82%20%D0%BF%D1%83%D1%82%D0%B8%20%28Serg%20Shenon%20%26%20Yudzhin%20Radio%20Remix%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'NEMIGA - Экстази (Andrey Vakulenko Remix)', 'file': 'http://promodj.com/download/6886480/NEMIGA%20-%20%D0%AD%D0%BA%D1%81%D1%82%D0%B0%D0%B7%D0%B8%20%28Andrey%20Vakulenko%20Remix%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Zifert - Life (Chiro Remix)', 'file': 'http://promodj.com/download/6966843/Zifert%20-%20Life%20%28Chiro%20Remix%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Chok — I have to say ( Nikolay Lavrentiev Remix )', 'file': 'http://promodj.com/download/6963947/Chok%20%E2%80%94%20I%20have%20to%20say%20%28%20Nikolay%20Lavrentiev%20Remix%20%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Intelligency - Август (Romis remix)', 'file': 'http://promodj.com/download/6980730/Intelligency%20-%20%D0%90%D0%B2%D0%B3%D1%83%D1%81%D1%82%20%28Romis%20remix%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Killahroom - Забери меня с собой на луну', 'file': 'http://promodj.com/download/6976079/Killahroom%20-%20%D0%97%D0%B0%D0%B1%D0%B5%D1%80%D0%B8%20%D0%BC%D0%B5%D0%BD%D1%8F%20%D1%81%20%D1%81%D0%BE%D0%B1%D0%BE%D0%B9%20%D0%BD%D0%B0%20%D0%BB%D1%83%D0%BD%D1%83%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Travis Scott - Goosebumps (Romis remix)', 'file': 'http://promodj.com/download/6968099/Travis%20Scott%20-%20Goosebumps%20%28Romis%20remix%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'PHARAOH - Без ключа (Kulich Radio Edit)', 'file': 'http://promodj.com/download/6980323/PHARAOH%20-%20%D0%91%D0%B5%D0%B7%20%D0%BA%D0%BB%D1%8E%D1%87%D0%B0%20%28Kulich%20Radio%20Edit%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
{'icon': iconImage, 'title': 'Niletto - Я останусь простым (Dj RuS)', 'file': 'http://promodj.com/download/6981814/Niletto%20-%20%D0%AF%20%D0%BE%D1%81%D1%82%D0%B0%D0%BD%D1%83%D1%81%D1%8C%20%D0%BF%D1%80%D0%BE%D1%81%D1%82%D1%8B%D0%BC%20%28Dj%20RuS%29%20%28promodj.com%29.mp3', 'cover': 'https://i1.sndcdn.com/avatars-000613656294-8p3p78-t500x500.jpg'},
  ]
});