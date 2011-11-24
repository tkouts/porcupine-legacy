.. highlight:: js

Label
=====

.. js:class:: QuiX.ui.Label(params)

   Creates a new label widget.

   **Derives from:** :js:class:`~QuiX.ui.Widget`

   :param object params: The parameters object

   Example usage::

      var w = new QuiX.ui.Label({left: 0,
                                 top: 0,
                                 width: 'auto',
                                 height: 'auto',
                                 caption: 'This is a label'});

   XML markup:

   .. code-block:: xml

      <label left="0" top="0" width="auto" height="auto" caption="This is a label"></label>

Attributes
----------

   .. js:attribute:: QuiX.ui.Label.wrap

      Boolean attribute specifying if the text wraps. Default value is ``false``.

      Example usage::

         label.wrap = true;
         label.redraw(true);

   .. js:attribute:: QuiX.ui.Label.align

      String attribute specifying the text alignment.
      Valid values are ``left``, ``right`` and ``auto`` which translates
      to left aligned text for ltr layouts and right aligned text for rtl
      layouts.
      Default value is ``auto``.

      Example usage::

         label.align = 'right';
         label.redraw(true);

Methods
-------

   .. js:function:: QuiX.ui.Label.getCaption()

      :returns: The text of the label


   .. js:function:: QuiX.ui.Label.setCaption(caption)

      Sets the text of the label.

      :param string caption: The text to set


   .. js:function:: QuiX.ui.Label.getTextOpacity()

      :returns: The text opacity expressed as a float number between 0 and 1.


   .. js:function:: QuiX.ui.Label.setTextOpacity(op)

      Adjusts the text opacity.

      :param number op: The text opacity expressed as a float number between 0 and 1.
