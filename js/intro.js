'use strict';

(function () {
	var image = document.querySelector('.__js_parallax-image');

	new simpleParallax(image, {
		delay: 0,
		orientation: 'down',
		scale: 1.5,
	});

})();

$(function() {
  $('.__js_marquee').marquee({
    duration: 15000,
    startVisible: true,
    duplicated: true
  });
});
