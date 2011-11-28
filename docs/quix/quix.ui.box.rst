.. highlight:: js

Box
===

.. js:class:: QuiX.ui.Box(params)

   Creates a new box widget.
   Vertical boxes stack their children vertically, while horizontal boxes
   stack their children horizontally.

   **Derives from:** :js:class:`~QuiX.ui.Widget`

   :param object params: The parameters object

      The ``spacing`` attribute defines the box's children spacing in pixels.

         .. seealso:: :js:attr:`~QuiX.ui.Box.spacing` attribute

      The ``childrenalign`` attribute defines the box's children alignment.

         .. seealso:: :js:attr:`~QuiX.ui.Box.childrenAlign` attribute

   Example usage::

      var w = new QuiX.ui.Box({left: 0,
                               top: 0,
                               width: '100%',
                               height: '100%',
                               orientation: 'v'});


   XML markup:

   .. code-block:: xml

      <box left="0" top="0" width="100%" height="100%" orientation="v"></box>

   .. ATTENTION:: It is imposible for horintal box descendants to set
                  their :js:attr:`~QuiX.ui.Widget.left` attribute. Likewise, it is
                  impossible for vertical box descendants to set
                  their :js:attr:`~QuiX.ui.Widget.top` attribute.

   .. NOTE:: Changing the contents of a box at runtime by adding or removing widgets
             requires that the box is fully redrawn after these modifications
             by using ``box.redraw(true);``

Attributes
----------

.. js:attribute:: QuiX.ui.Box.spacing

   Attribute specifying the box's spacing in pixels.
   Default value is 2.

   Example usage::

      box.spacing = 4;
      box.redraw(true);

--------------------------------------------------------------------------------

.. js:attribute:: QuiX.ui.Box.childrenAlign

   Specifies the children alignment.
   For vertical boxes it should be set to ``left``, ``right`` or ``center``.
   For horizontal boxes it should be set to ``top``, ``bottom`` or ``center``.

   Default value is ``top`` for horizontal boxes and ``left``
   for vertical boxes.

   Example usage::

      box.childrenAlign = 'center';
      box.redraw(true);

HBox
====

.. js:class:: QuiX.ui.HBox(params)

   Creates a new horizontal box widget.
   A shortcut of ``new QuiX.ui.Box({orientation:'h'})``.

   **Derives from:** :js:class:`~QuiX.ui.Box`

   :param object params: The parameters object

   Example usage::

      var w = new QuiX.ui.HBox({left: 0,
                                top: 0,
                                width: '100%',
                                height: 50});

   XML markup:

   .. code-block:: xml

      <hbox left="0" top="0" width="100%" height="50"></hbox>

VBox
====

.. js:class:: QuiX.ui.VBox(params)

   Creates a new vertical box widget.
   A shortcut of ``new QuiX.ui.Box({orientation:'v'})``.

   **Derives from:** :js:class:`~QuiX.ui.Box`

   :param object params: The parameters object

   Example usage::

      var w = new QuiX.ui.VBox({left: 0,
                                top: 0,
                                width: '100%',
                                height: '100%'});

   XML markup:

   .. code-block:: xml

      <vbox left="0" top="0" width="100%" height="100%"></vbox>
