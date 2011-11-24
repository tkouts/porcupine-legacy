.. highlight:: js

Button
======

.. js:class:: QuiX.ui.Button(params)

   Creates a new button widget.

   **Derives from:** :js:class:`~QuiX.ui.Widget`

   :param object params: The parameters object

   Example usage::

      var w = new QuiX.ui.Button({left: 0,
                                  top: 0,
                                  width: 80,
                                  height: 100,
                                  img: 'IMG_URL',
                                  caption: 'Press me'});

   XML markup:

   .. code-block:: xml

      <button left="0" top="0" width="80" height="100"
        img="IMG_URL" caption="Press me"></button>

Attributes
----------

   .. js:attribute:: QuiX.ui.Button.align

      String attribute specifying the button's text alignment.
      Valid values are ``left``, ``right`` and ``auto`` which translates
      to left aligned text for ltr layouts and right aligned text for rtl
      layouts.
      Default value is ``auto``.

      Example usage::

         button.align = 'right';
         button.redraw();


   .. js:attribute:: QuiX.ui.Button.imgAlign

      String attribute specifying the button's image alignment.
      Valid values are ``left``, ``right``, ``top`` and ``bottom``.

      Default value is ``left``.

      Example usage::

         button.imgAlign = 'top';
         button.redraw();


   .. js:attribute:: QuiX.ui.Button.spacing

      Number attribute specifying the spacing between the button's image and
      the button's text in pixels.
      Default value is 4.

      Example usage::

         button.spacing = 8;
         button.redraw();

Methods
-------

   .. js:function:: QuiX.ui.Button.getCaption()

      :returns: The text of the button


   .. js:function:: QuiX.ui.Button.setCaption(caption)

      Sets the text of the button.

      :param string caption: The text to set


   .. js:function:: QuiX.ui.Button.getTextOpacity()

      :returns: The text opacity expressed as a float number between 0 and 1.


   .. js:function:: QuiX.ui.Button.setTextOpacity(op)

      Adjusts the text opacity.

      :param number op: The text opacity expressed as a float number between 0 and 1.


   .. js:function:: QuiX.ui.Button.getImageURL()

      :returns: The URL of the button's image if specified, otherwise ``null``


   .. js:function:: QuiX.ui.Button.setImageURL(url)

      Specifies the button's image URL.

      :param string url: The URL of the button's image
