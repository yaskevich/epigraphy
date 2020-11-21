function firFrame(that){
	$(that||'.ext-content').height($('#modal-3d>.modal-content').height() - 20);
}
$(window).resize(function() { firFrame() });  
$(function() {
    var pathname = window.location.pathname;
    console.log(pathname);
	// actually, client code renders one of two pages: 
	// either root page (list of all inscriptions) 
	// or page with details of single inscriptions
    function renderRoot(data) {

        var hiddens = [];
        var filtersDisabled = {};
        var slideControl;

        function showCount() {
            $('.count').html(data.records.length - hiddens.length + " из " + data.records.length);
        }
		
		// filters logic
        function applyFilters(datum) {
            // console.log(filtersDisabled);
            $.each(datum, function(key, val) {
                var isShown = true;
                for (var dis in filtersDisabled) {
                    var ids = filtersDisabled[dis];
                    if (ids.length) {
                        var isDis = ids.indexOf(val[dis]) !== -1;
                        // console.log(ids, val[dis], typeof ids[0], typeof val[dis]);
                        if (isDis) {
                            // console.log(dis, ids, val[dis], isDis, val.id);
                            isShown = false;
                            break;
                        }
                    }
                }

                var hid_index = hiddens.indexOf(val.id);

                if (isShown && hid_index >= 0) {
                    $('tr#id' + val.id).removeClass('is-hidden');
                    hiddens.splice(hid_index, 1);
                }
                if (!isShown && hid_index == -1) {
                    $('tr#id' + val.id).addClass('is-hidden');
                    hiddens.push(val.id)
                }
            });
            showCount();
        }
		// function initSlider(){
			// $('#yearslider')
				// .attr("min", data.meta.years[0])
				// .attr("max", data.meta.years[1])
				// .val(data.meta.years[1])
				// .next().text(data.meta.years[1]);
		// }
        // init controls
        $('input:radio[name="checksort"]#sort-yr').click();
        $('input:radio[name="checkfilters"]#check-all').click(); // .attr('checked', true);        
        $('.switch-filters').prop('checked', false);
        $(".place-finder").val('');

        // init page state
        $('.setup').removeClass('is-hidden');
        $('.nav-loc').click(function() {
            $('.cirtable').addClass('is-hidden');
            $('.toggle-filters').addClass('is-hidden');
            $('.loctable').removeClass('is-hidden');
            $('.nav-ins').removeClass('bold');
            $('.nav-loc').addClass('bold');

            $('.setup').addClass('is-hidden');
            $('.filters-set').addClass('is-hidden');
            $('.switch-filters').prop('checked', false);
        });

        // logic of static controls
        $('.nav-ins').click(function() {
            $('.cirtable').removeClass('is-hidden');
            $('.toggle-filters').removeClass('is-hidden');
            $('.nav-loc').removeClass('bold');
            $('.loctable').addClass('is-hidden');
            $('.nav-ins').addClass('bold');
            $('.setup').removeClass('is-hidden');
        });
        $('.switch-filters').click(function() {
            $('.filters-set').toggleClass('is-hidden');
            $('.filters-show').toggleClass('is-hidden');
            $('.filters-hide').toggleClass('is-hidden');
        })
        $(".toggle-filters").click(function() {
            $('.filters-set').toggleClass('is-hidden');
            $('.filters-show').toggleClass('is-hidden');
            $('.filters-hide').toggleClass('is-hidden');
        });
        $("input[name='checksort']").change(function() {
            var attr = $(this).attr("id").split('-')[1];
            var result = $('table.cirtable > tbody > tr').sort(function(a, b) {
                var x1 = parseInt($(a).data(attr));
                var x2 = parseInt($(b).data(attr));
                return (x1 < x2) ? -1 : (x1 > x2) ? 1 : 0;
            });
            $('table.cirtable > tbody').html(result);
        });
        $('.modal-background').click(function() {
            $('#modal-img.modal').removeClass("is-active");
        });
        $('button.delete, button.cancel').click(function() {
            $(this).parent().removeClass("is-active");
        });


		
		// logic of dynamic controls
        $(document).on('click', '.filtering', function() {
            // var str = $(this).attr('id');
            var state = $(this).prop("checked");
            console.log("filter", state);
            var feature = $(this).data("feature");
            var id = $(this).data("id").toString();

            if (state) {
                filtersDisabled[feature] = jQuery.grep(filtersDisabled[feature], function(el) {
                    return el != id;
                });
            } else {
                filtersDisabled[feature].push(id);
            }

            var method = filtersDisabled[feature].length ? 'removeClass' : 'addClass';
            $(this).parents().eq(3).find('div.dropdown-trigger > button.button > span > .fa-filter')[method]('is-hidden');
            applyFilters(data.records);
        }).on('change', '.timeslider', function(event) {
            // var newv = $(this).val();
            // $(this).next().text(newv);
			
			// filtersDisabled["ymin"] = jQuery.grep(data.meta.ymins, function(value) {
                    // return ((value > newv) && (value != 2000));
            // });
			
            // console.log("slide", newv, filtersDisabled["ymin"].length);
			// applyFilters(data.records);
			// $('.slider-box')[newv == $(this).attr("max") ? 'removeClass': 'addClass']("box-active");
        }).on("click", "img.preview", function() {
			var mini = $(this).data("src");			
			if (mini){
				$('.single-image').attr("src", mini.replace("72px", "10pcnt"));
				$('#modal-img.modal').addClass("is-active");
			}
        }).on("click", ".show-3d", function() {
			$('iframe.ext-content').attr("src", "models/OG1105.html");
			$('#modal-3d.modal').addClass("is-active");
        }).on("click", ".clear-place", function() {
            $('.place-finder').val('');
			$('.clear-place').removeClass("red-back");
            filtersDisabled["ogl"] = [];
            applyFilters(data.records);
        }).on("click", ".all-clear", function() {
            for (var dis in filtersDisabled) { filtersDisabled[dis] = []; }
            $('.userfilter').addClass('is-hidden');
            $('.filtering').prop('checked', true);
            $('.place-finder').val('');
			$('.clear-place').removeClass("red-back");
			// initSlider();
            slideControl.reset();
            applyFilters(data.records);
        }).on("click", ".filter-clean,.filter-check", function() {
            var cls = $(this).attr("class");
            var checkAll = cls === "filter-check";
            var code = $(this).parent().data('feature');
            var userfilter = $(this).parents().eq(3)
					.find('div.dropdown-trigger > button.button > span > .fa-filter');
            var feats = [];
            $(this)
                .parent()
                .parent()
                .children(".dropdown-item")
                .each(function(index) {
                    var that = $(this).children("input");
                    feats.push(that.data("id").toString());
                    that.prop('checked', checkAll);
                });

            if (checkAll) {
                filtersDisabled[code] = [];
                userfilter.addClass('is-hidden')
            } else {
                userfilter.removeClass('is-hidden')
                filtersDisabled[code] = feats;
            }
			
            applyFilters(data.records);
            // console.log(filtersDisabled, cls);		
        });

        // filling the HTML page
		var tmpl = $('#drop').html();
		data.meta.filters.map(function(key){
			filtersDisabled[key] = [];
			var view = Mustache.render(tmpl, {"code": key, "title": data.fields[key], "items": data.corpus_filters[key]});
            $('.column.' + key).html(view);
		});
		
        // initSlider();
		// $('#yearslider').attr("data-tippy-content", "Выберите год от " + data.meta.years[0] + " до " + data.meta.years[1] + ". Если год больше выбранного, запись не отображается");
        showCount();
		$('.update').html(data.meta.update);
        $(".cirtable").append(Mustache.render($('#cirtablesource').html(), data));

        var tbodyLoc = data.places.map(function(d) {
            var tr = "<tr id=" + d.ogl + ">";
			var cols2 = data.meta.cols2;
            for (a in cols2) {
                var val = d[cols2[a]];
                var numval = parseInt(val);
                if (numval && data.places_features_sorted.hasOwnProperty(numval)) {
                    // console.log(numval, data.places_features[numval]);
                    val = data.places_features_sorted[numval].v;
                }
                tr += "<td>" + (val || "<span class='red'>▪</span>") + "</td>"
            }
            return tr + "</tr>";
        });
		
        $(".loctable>tbody").append(tbodyLoc);

        var options = {
            "lookup":  function (query, done) {
					var re  = new RegExp(query,"gi");
					var result = {
						suggestions: data.places
							.filter(function(d){ return d.name && d.name.match(re) })
							.map(function(d){ 
								// value: d.name || '(пусто)',
								d.value = d.name;
								d.data = d.ogl;
								return d;
							})
					};
					done(result);
			},
			"width": "flex",
			"showNoSuggestionNotice": true, 
			"noSuggestionNotice": "Нет совпадений",
            onSelect: function(suggestion) {
                filtersDisabled["ogl"] = jQuery.grep(data.meta.ogls, function(value) {
                    return value != suggestion.data;
                });
				$('.clear-place').addClass("red-back");
                console.log('You selected: ' + suggestion.value + ', ' + suggestion.data);
                // console.log(filtersDisabled["ogl"]);
                applyFilters(data.records);
            }
        };

        $(".place-finder").autocomplete(options);        
        slideControl = noUiSlider.create($('#slider')[0], {
            start: [data.meta.years[0], data.meta.years[1]],
            connect: true,
            tooltips: [true, true],
            range: {
                'min': data.meta.years[0],
                'max': data.meta.years[1]
            },
              format: {
                // 'to' the formatted value. Receives a number.
                to: function (value) {
                    return Math.round(value);
                },
                // 'from' the formatted value.
                // Receives a string, should return a number.
                from: function (value) {
                    return Number(value);
                }
            }
        });
        
        slideControl.on('change', function (limits, handle) {
            
            filtersDisabled["ymin"] = jQuery.grep(data.meta.ymins, function(value) {
                    return ((value && value < limits[0]) || value > limits[1]);
            });
			
            // console.log("slide", limits, filtersDisabled["ymin"].length);
			// console.log(filtersDisabled["ymin"]);
			applyFilters(data.records);
            
        });
                

        tippy('[data-tippy-content]', {
            "placement": 'bottom',
            "maxWidth": 260
        });
        
        
        // as soon as there are plenty of images and big deal of them does not exist
		// it is reasonable to exploit lazy load technique
		var lazyLoadInstance = new LazyLoad({ elements_selector: ".lazy" });
		lazyLoadInstance.update();
    }

	if (pathname === "/") {
		renderRoot(data);
	} else {
		// single
		var rendered = Mustache.render($('#card').html(), data.records[0]);
		$('.single').html(rendered);
		// $('#modal-3d.modal').addClass("is-active");
	}
	
});